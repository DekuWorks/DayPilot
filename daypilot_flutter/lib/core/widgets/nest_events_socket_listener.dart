import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/daypilot_env.dart';
import '../providers/api_session_sync_provider.dart';
import '../providers/bootstrap_providers.dart';
import '../providers/calendar_refresh_provider.dart';
import '../../data/services/nest_events_socket_service.dart';

/// Connects to Nest `/ws` when Option C session is ready; bumps calendar on `event:*`.
class NestEventsSocketListener extends ConsumerStatefulWidget {
  const NestEventsSocketListener({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<NestEventsSocketListener> createState() =>
      _NestEventsSocketListenerState();
}

class _NestEventsSocketListenerState
    extends ConsumerState<NestEventsSocketListener> {
  NestEventsSocketService? _socket;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _syncFromApiSession();
    });
  }

  @override
  void dispose() {
    _disconnect();
    super.dispose();
  }

  void _disconnect() {
    _socket?.disconnect();
    _socket = null;
  }

  void _syncFromApiSession() {
    if (!DayPilotEnv.hasDaypilotApi) {
      _disconnect();
      return;
    }

    final sync = ref.read(apiSessionSyncProvider);
    if (sync.status != ApiSessionSyncStatus.ready) {
      _disconnect();
      return;
    }

    final token = ref.read(nestApiSessionProvider).accessToken;
    if (token == null || token.isEmpty) {
      _disconnect();
      return;
    }

    _disconnect();
    _socket = NestEventsSocketService(
      accessToken: token,
      onCalendarSync: () {
        ref.read(calendarDataVersionProvider.notifier).bump();
      },
    )..connect();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<ApiSessionSyncState>(apiSessionSyncProvider, (prev, next) {
      if (prev?.status == next.status && next.status != ApiSessionSyncStatus.ready) {
        return;
      }
      if (next.status == ApiSessionSyncStatus.ready) {
        _syncFromApiSession();
      } else {
        _disconnect();
      }
    });

    ref.listen<AsyncValue<AuthState>>(authStateChangeProvider, (prev, next) {
      next.whenData((authState) {
        if (authState.session == null) {
          _disconnect();
        }
      });
    });

    return widget.child;
  }
}
