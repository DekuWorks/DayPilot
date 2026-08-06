import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../data/repositories/calendar_connections_repository.dart';
import '../../data/services/apple_calendar_service.dart';
import '../integrations/integrations_screen.dart';

const _providers = <({
  String id,
  String name,
  String description,
  bool calendarReady
})>[
  (
    id: 'google',
    name: 'Google Calendar',
    description: 'Events sync two-way with your Google account.',
    calendarReady: true,
  ),
  (
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    description: 'Events sync two-way with Outlook or Microsoft 365.',
    calendarReady: true,
  ),
  (
    id: 'apple_eventkit',
    name: 'Apple Calendar',
    description:
        'Connect through this iPhone (EventKit). Sign in with Apple is separate and does not grant calendar access.',
    calendarReady: true,
  ),
];

/// Profile → Sync: connection status, last sync, token validation.
class SyncScreen extends ConsumerStatefulWidget {
  const SyncScreen({super.key});

  @override
  ConsumerState<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends ConsumerState<SyncScreen>
    with WidgetsBindingObserver {
  String? _actionId;
  String? _error;
  Map<String, dynamic>? _eventKitStatus;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadEventKit());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(calendarConnectionsProvider);
      _loadEventKit();
      _incrementalEventKitSync();
    }
  }

  Future<void> _loadEventKit() async {
    if (!DayPilotEnv.hasDaypilotApi || !AppleCalendarService.isSupported) {
      return;
    }
    try {
      final status = await ref
          .read(calendarConnectionsRepositoryProvider)
          .getEventKitStatus();
      if (mounted) setState(() => _eventKitStatus = status);
    } catch (_) {
      // Non-fatal on Sync load.
    }
  }

  Future<void> _incrementalEventKitSync() async {
    if (!AppleCalendarService.isSupported || !DayPilotEnv.hasDaypilotApi) {
      return;
    }
    final connections = (_eventKitStatus?['connections'] as List?) ?? [];
    if (connections.isEmpty) return;
    try {
      final service = AppleCalendarService();
      final deviceId = await service.deviceId();
      final conn = connections.cast<dynamic>().firstWhere(
            (c) => (c as Map)['deviceId'] == deviceId,
            orElse: () => connections.first,
          ) as Map;
      final calendars = (conn['calendars'] as List? ?? [])
          .cast<dynamic>()
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((c) => c['isSelected'] == true)
          .toList();
      if (calendars.isEmpty) return;
      final events = await service.getSelectedCalendarEvents(
        calendarIds: calendars.map((c) => c['externalCalendarId'] as String),
      );
      await ref.read(calendarConnectionsRepositoryProvider).syncEventKit(
            deviceId: deviceId,
            deviceLabel: (conn['displayName'] as String?) ?? 'iPhone',
            calendars: calendars
                .map(
                  (c) => {
                    'externalCalendarId': c['externalCalendarId'],
                    'title': c['title'],
                    'calendarType': c['calendarType'],
                    'sourceName': c['sourceName'],
                    'color': c['color'],
                    'isPrimary': c['isPrimary'] == true,
                    'isReadOnly': c['isReadOnly'] == true,
                    'isSelected': true,
                    'isVisible': c['isVisible'] != false,
                  },
                )
                .toList(),
            events: events.map((e) => e.toApiJson()).toList(),
          );
      ref.invalidate(calendarConnectionsProvider);
      ref.read(calendarDataVersionProvider.notifier).bump();
      await _loadEventKit();
    } catch (_) {
      // Background refresh — surface via manual Sync if needed.
    }
  }

  Future<void> _connect(String provider) async {
    if (provider == 'apple_eventkit' || provider == 'apple') {
      if (!AppleCalendarService.isSupported) {
        setState(
          () => _error =
              'Apple Calendar setup requires the DayPilot iOS app.',
        );
        return;
      }
      if (mounted) context.push('/integrations/apple-calendar');
      return;
    }
    setState(() {
      _error = null;
      _actionId = provider;
    });
    try {
      final url = await ref
          .read(calendarConnectionsRepositoryProvider)
          .getConnectUrl(provider);
      final launched =
          await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        setState(() => _error = 'Could not open browser for sign-in.');
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Complete sign-in in your browser, then return here.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  Future<void> _sync(String id) async {
    setState(() {
      _error = null;
      _actionId = 'sync-$id';
    });
    try {
      await ref.read(calendarConnectionsRepositoryProvider).sync(id);
      ref.invalidate(calendarConnectionsProvider);
      ref.read(calendarDataVersionProvider.notifier).bump();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Calendar synced.')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  Future<void> _validate(String id) async {
    setState(() {
      _error = null;
      _actionId = 'validate-$id';
    });
    try {
      final result =
          await ref.read(calendarConnectionsRepositoryProvider).validate(id);
      ref.invalidate(calendarConnectionsProvider);
      if (!result.valid && mounted) {
        setState(() => _error = result.error ?? 'Connection needs reconnect.');
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connection validated.')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  Future<void> _disconnect(String id) async {
    setState(() {
      _error = null;
      _actionId = id;
    });
    try {
      await ref.read(calendarConnectionsRepositoryProvider).disconnect(id);
      ref.invalidate(calendarConnectionsProvider);
      ref.read(calendarDataVersionProvider.notifier).bump();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  Future<void> _disconnectEventKit() async {
    final keep = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Apple Calendar?'),
        content: const Text(
          'DayPilot will stop synchronizing calendars from this device. '
          'Your events will remain in iCloud.\n\n'
          'Keep imported events visible in DayPilot?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Remove from DayPilot'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keep events'),
          ),
        ],
      ),
    );
    if (keep == null || !mounted) return;
    setState(() {
      _error = null;
      _actionId = 'apple_eventkit';
    });
    try {
      final deviceId = await AppleCalendarService().deviceId();
      await ref.read(calendarConnectionsRepositoryProvider).disconnectEventKit(
            deviceId: deviceId,
            keepEvents: keep,
          );
      ref.invalidate(calendarConnectionsProvider);
      ref.read(calendarDataVersionProvider.notifier).bump();
      await _loadEventKit();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  String _formatWhen(DateTime? dt) {
    if (dt == null) return 'Never';
    final local = dt.toLocal();
    final d = MaterialLocalizations.of(context);
    return '${d.formatShortDate(local)} ${d.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
  }

  Color _statusColor(ConnectionValidationStatus status) {
    switch (status) {
      case ConnectionValidationStatus.valid:
        return DayPilotColors.brand500;
      case ConnectionValidationStatus.expired:
        return DayPilotColors.warning;
      case ConnectionValidationStatus.needsReconnect:
        return DayPilotColors.error;
      case ConnectionValidationStatus.unknown:
        return DayPilotColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!DayPilotEnv.hasDaypilotApi) {
      return const FeatureScaffold(
        title: 'Sync',
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Calendar sync is temporarily unavailable. '
              'Try again later, or contact support if this continues.',
              textAlign: TextAlign.center,
              style: TextStyle(color: DayPilotColors.textSecondary),
            ),
          ),
        ),
      );
    }

    final async = ref.watch(calendarConnectionsProvider);
    final appleLinked = ref.read(authRepositoryProvider).hasAppleIdentity;
    final ekConnections =
        (_eventKitStatus?['connections'] as List?)?.cast<dynamic>() ?? [];
    final ekConnected = ekConnections.isNotEmpty;
    final ekConn = ekConnected ? ekConnections.first as Map : null;

    return FeatureScaffold(
      title: 'Sync',
      body: RefreshIndicator(
        color: DayPilotColors.brand500,
        onRefresh: () async {
          ref.invalidate(calendarConnectionsProvider);
          await ref.read(calendarConnectionsProvider.future);
          await _loadEventKit();
          await _incrementalEventKitSync();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            const Text(
              'See which calendars are connected, when they last synced, '
              'and whether the connection is still valid.',
              style: TextStyle(
                color: DayPilotColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            _AppleAccountCard(linked: appleLinked),
            const SizedBox(height: 12),
            _AppleCalendarStatusCard(
              connected: ekConnected,
              displayName: ekConn?['displayName'] as String?,
              calendarCount: (ekConn?['calendars'] as List?)?.length ?? 0,
              lastSynced: ekConn?['lastSyncedAt'] as String?,
              busy: _actionId != null,
              syncing: _actionId == 'apple_eventkit-sync',
              onConnect: () => _connect('apple_eventkit'),
              onSyncNow: ekConnected
                  ? () async {
                      setState(() => _actionId = 'apple_eventkit-sync');
                      await _incrementalEventKitSync();
                      if (mounted) setState(() => _actionId = null);
                    }
                  : null,
              onDisconnect: ekConnected ? _disconnectEventKit : null,
              onManage: ekConnected
                  ? () => context.push('/integrations/apple-calendar')
                  : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: DayPilotColors.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: DayPilotColors.error.withValues(alpha: 0.35),
                  ),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: DayPilotColors.error),
                ),
              ),
            ],
            const SizedBox(height: 20),
            async.when(
              loading: () => const LinearProgressIndicator(
                color: DayPilotColors.brand500,
              ),
              error: (e, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '$e',
                    style: const TextStyle(color: DayPilotColors.error),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () =>
                        ref.invalidate(calendarConnectionsProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
              data: (connections) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ..._providers.where((p) => p.id != 'apple_eventkit').map((p) {
                    CalendarConnection? conn;
                    for (final c in connections) {
                      if (c.provider == p.id) {
                        conn = c;
                        break;
                      }
                    }
                    final connId = conn?.id;
                    return _SyncProviderCard(
                      name: p.name,
                      description: p.description,
                      connection: conn,
                      calendarReady: p.calendarReady,
                      busy: _actionId != null,
                      validating: connId != null &&
                          _actionId == 'validate-$connId',
                      syncing:
                          connId != null && _actionId == 'sync-$connId',
                      disconnecting: connId != null && _actionId == connId,
                      connecting: _actionId == p.id,
                      formatWhen: _formatWhen,
                      statusColor: _statusColor,
                      onConnect: () => _connect(p.id),
                      onValidate: connId == null
                          ? null
                          : () => _validate(connId),
                      onSync:
                          connId == null ? null : () => _sync(connId),
                      onDisconnect: connId == null
                          ? null
                          : () => _disconnect(connId),
                      onReconnect: conn != null &&
                              (conn.status ==
                                      ConnectionValidationStatus
                                          .needsReconnect ||
                                  conn.status ==
                                      ConnectionValidationStatus.expired)
                          ? () => _connect(p.id)
                          : null,
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppleAccountCard extends StatelessWidget {
  const _AppleAccountCard({required this.linked});

  final bool linked;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotColors.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotColors.borderSubtle),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Apple Account',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Sign in with Apple (account only — not calendar access).',
                  style: TextStyle(
                    color: DayPilotColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Text(
            linked ? 'Connected' : 'Not connected',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: linked
                  ? DayPilotColors.brand500
                  : DayPilotColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

class _AppleCalendarStatusCard extends StatelessWidget {
  const _AppleCalendarStatusCard({
    required this.connected,
    required this.displayName,
    required this.calendarCount,
    required this.lastSynced,
    required this.busy,
    required this.syncing,
    required this.onConnect,
    required this.onSyncNow,
    required this.onDisconnect,
    required this.onManage,
  });

  final bool connected;
  final String? displayName;
  final int calendarCount;
  final String? lastSynced;
  final bool busy;
  final bool syncing;
  final VoidCallback onConnect;
  final VoidCallback? onSyncNow;
  final VoidCallback? onDisconnect;
  final VoidCallback? onManage;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotColors.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Apple Calendar',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
              ),
              Text(
                connected ? 'Connected' : 'Setup required',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: connected
                      ? DayPilotColors.brand500
                      : DayPilotColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            connected
                ? 'Connected through ${displayName ?? 'this iPhone'}\n'
                    '$calendarCount calendars · Last synced ${lastSynced ?? 'Never'}'
                : 'Open the guided setup to allow calendar access and choose calendars.',
            style: const TextStyle(
              color: DayPilotColors.textSecondary,
              fontSize: 13,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (!connected)
                FilledButton(
                  onPressed: busy ? null : onConnect,
                  child: const Text('Connect Apple Calendar'),
                )
              else ...[
                OutlinedButton(
                  onPressed: busy ? null : onSyncNow,
                  child: Text(syncing ? 'Syncing…' : 'Sync now'),
                ),
                OutlinedButton(
                  onPressed: busy ? null : onManage,
                  child: const Text('Manage calendars'),
                ),
                TextButton(
                  onPressed: busy ? null : onDisconnect,
                  style: TextButton.styleFrom(
                    foregroundColor: DayPilotColors.error,
                  ),
                  child: const Text('Disconnect'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _SyncProviderCard extends StatelessWidget {
  const _SyncProviderCard({
    required this.name,
    required this.description,
    required this.connection,
    required this.calendarReady,
    required this.busy,
    required this.validating,
    required this.syncing,
    required this.disconnecting,
    required this.connecting,
    required this.formatWhen,
    required this.statusColor,
    required this.onConnect,
    required this.onValidate,
    required this.onSync,
    required this.onDisconnect,
    required this.onReconnect,
  });

  final String name;
  final String description;
  final CalendarConnection? connection;
  final bool calendarReady;
  final bool busy;
  final bool validating;
  final bool syncing;
  final bool disconnecting;
  final bool connecting;
  final String Function(DateTime?) formatWhen;
  final Color Function(ConnectionValidationStatus) statusColor;
  final VoidCallback onConnect;
  final VoidCallback? onValidate;
  final VoidCallback? onSync;
  final VoidCallback? onDisconnect;
  final VoidCallback? onReconnect;

  @override
  Widget build(BuildContext context) {
    final connected = connection != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotColors.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
              ),
              Text(
                connected ? 'Connected' : 'Not connected',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: connected
                      ? DayPilotColors.brand500
                      : DayPilotColors.textTertiary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: const TextStyle(
              color: DayPilotColors.textSecondary,
              fontSize: 13,
            ),
          ),
          if (connection != null) ...[
            const SizedBox(height: 12),
            _MetaRow(
              label: 'Account',
              value: connection!.email.isEmpty ? '—' : connection!.email,
            ),
            _MetaRow(
              label: 'Validation',
              value: connection!.status.label,
              valueColor: statusColor(connection!.status),
            ),
            _MetaRow(
              label: 'Last synced',
              value: formatWhen(connection!.syncedAt),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: busy ? null : onValidate,
                  child: Text(validating ? 'Checking…' : 'Validate'),
                ),
                OutlinedButton(
                  onPressed: busy ? null : onSync,
                  child: Text(syncing ? 'Syncing…' : 'Sync now'),
                ),
                if (onReconnect != null)
                  FilledButton(
                    onPressed: busy ? null : onReconnect,
                    child: const Text('Reconnect'),
                  ),
                TextButton(
                  onPressed: busy ? null : onDisconnect,
                  style: TextButton.styleFrom(
                    foregroundColor: DayPilotColors.error,
                  ),
                  child: Text(disconnecting ? 'Disconnecting…' : 'Disconnect'),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: busy ? null : onConnect,
              child: Text(connecting ? 'Opening…' : 'Connect'),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                color: DayPilotColors.textTertiary,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: valueColor ?? DayPilotColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
