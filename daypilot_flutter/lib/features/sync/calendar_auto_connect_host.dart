import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_connection_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../data/repositories/calendar_connections_repository.dart';
import '../../data/services/calendar_sync_service.dart';
import '../billing/entitlements.dart';

/// After sign-in, refresh a calendar that is already connected.
///
/// Google or Outlook: silent refresh, or OAuth if the account is missing.
/// Apple Calendar is not opened here. The system permission is requested
/// only when the user taps Connect on Sync.
class CalendarAutoConnectHost extends ConsumerStatefulWidget {
  const CalendarAutoConnectHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<CalendarAutoConnectHost> createState() =>
      _CalendarAutoConnectHostState();
}

class _CalendarAutoConnectHostState
    extends ConsumerState<CalendarAutoConnectHost> {
  bool _ranThisSession = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeRun());
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<ApiSessionSyncState>(apiSessionSyncProvider, (prev, next) {
      if (next.status == ApiSessionSyncStatus.ready) {
        _maybeRun();
      } else if (next.status == ApiSessionSyncStatus.idle) {
        _ranThisSession = false;
      }
    });
    return widget.child;
  }

  Future<void> _maybeRun() async {
    if (_ranThisSession || !mounted) return;
    if (!DayPilotEnv.hasDaypilotApi) return;
    final session = ref.read(supabaseClientProvider).auth.currentSession;
    if (session == null) return;
    if (ref.read(apiSessionSyncProvider).status != ApiSessionSyncStatus.ready) {
      return;
    }

    _ranThisSession = true;
    final userId = session.user.id;
    final prefs = ref.read(sharedPreferencesProvider);
    final repo = ref.read(calendarConnectionsRepositoryProvider);
    final sync = ref.read(calendarSyncServiceProvider);
    final auth = ref.read(authRepositoryProvider);

    try {
      final connections = await repo.listConnections();
      await _maybeRefreshOrConnectGoogle(
        connections: connections,
        hasGoogleIdentity: auth.hasGoogleIdentity,
        prefsOffered: prefs.getBool('calendar_autoconnect_google_$userId') ==
            true,
        markOffered: () =>
            prefs.setBool('calendar_autoconnect_google_$userId', true),
        sync: sync,
      );
      await _maybeRefreshOrConnectOutlook(
        connections: connections,
        hasMicrosoftIdentity: auth.hasMicrosoftIdentity,
        prefsOffered: prefs.getBool('calendar_autoconnect_outlook_$userId') ==
            true,
        markOffered: () =>
            prefs.setBool('calendar_autoconnect_outlook_$userId', true),
        sync: sync,
        repo: repo,
      );
      invalidateCalendarStatus(ref);
      ref.read(calendarDataVersionProvider.notifier).bump();
    } catch (_) {
      // Non-fatal — Profile/Sync still show honest status.
    }

  }

  Future<void> _maybeRefreshOrConnectGoogle({
    required List<CalendarConnection> connections,
    required bool hasGoogleIdentity,
    required bool prefsOffered,
    required Future<bool> Function() markOffered,
    required CalendarSyncService sync,
  }) async {
    CalendarConnection? google;
    for (final c in connections) {
      if (c.provider == 'google') {
        google = c;
        break;
      }
    }

    if (google != null &&
        google.status == ConnectionValidationStatus.expired) {
      try {
        await sync.syncOAuth(google.id);
      } catch (_) {
        // Token refresh failed — UI shows Token expired + Reconnect.
      }
      return;
    }

    final needsOauth = google == null
        ? hasGoogleIdentity
        : google.status == ConnectionValidationStatus.needsReconnect;
    if (!needsOauth || prefsOffered) return;
    if (google == null &&
        !await canAddCalendarConnection(
          ref.read(nestApiSessionProvider),
          connections.length,
        )) {
      return;
    }

    await markOffered();
    try {
      await sync.launchConnect('google');
    } catch (_) {
      // User can tap Reconnect on Profile / Sync.
    }
  }

  Future<void> _maybeRefreshOrConnectOutlook({
    required List<CalendarConnection> connections,
    required bool hasMicrosoftIdentity,
    required bool prefsOffered,
    required Future<bool> Function() markOffered,
    required CalendarSyncService sync,
    required CalendarConnectionsRepository repo,
  }) async {
    CalendarConnection? outlook;
    for (final c in connections) {
      if (c.provider == 'outlook') {
        outlook = c;
        break;
      }
    }

    if (outlook != null &&
        outlook.status == ConnectionValidationStatus.expired) {
      try {
        await sync.syncOAuth(outlook.id);
      } catch (_) {}
      return;
    }

    final needsOauth = outlook == null
        ? hasMicrosoftIdentity
        : outlook.status == ConnectionValidationStatus.needsReconnect;
    if (!needsOauth || prefsOffered) return;
    if (outlook == null &&
        !await canAddCalendarConnection(
          ref.read(nestApiSessionProvider),
          connections.length,
        )) {
      return;
    }

    await markOffered();
    final session =
        ref.read(supabaseClientProvider).auth.currentSession;
    final providerToken = session?.providerToken;
    if (providerToken != null && providerToken.isNotEmpty) {
      try {
        await repo.importOutlookProviderToken(
          accessToken: providerToken,
          refreshToken: session?.providerRefreshToken,
        );
        return;
      } catch (_) {
        // Token lacked calendar scopes — fall through to Nest OAuth.
      }
    }
    try {
      await sync.launchConnect('outlook');
    } catch (_) {}
  }

}
