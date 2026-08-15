import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/calendar_connection_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../data/services/apple_calendar_service.dart';
import '../../domain/calendar/calendar_connection_ui.dart';

/// Profile → Sync: one status per provider, one Sync all button.
class SyncScreen extends ConsumerStatefulWidget {
  const SyncScreen({super.key});

  @override
  ConsumerState<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends ConsumerState<SyncScreen>
    with WidgetsBindingObserver {
  String? _actionId;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      invalidateCalendarStatus(ref);
      _incrementalEventKitSync();
    }
  }

  Future<void> _incrementalEventKitSync() async {
    try {
      await ref.read(calendarSyncServiceProvider).syncEventKitIncremental(
            ref.read(eventKitStatusProvider).asData?.value,
          );
      invalidateCalendarStatus(ref);
      ref.read(calendarDataVersionProvider.notifier).bump();
    } catch (_) {
      // Background refresh — surface via Sync all if needed.
    }
  }

  Future<void> _connect(String provider) async {
    if (provider == 'apple') {
      if (!AppleCalendarService.isSupported) {
        setState(
          () => _error = 'Apple Calendar setup requires the DayPilot iOS app.',
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
      final launched =
          await ref.read(calendarSyncServiceProvider).launchConnect(provider);
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

  Future<void> _syncAll() async {
    setState(() {
      _error = null;
      _actionId = 'sync-all';
    });
    try {
      final connections =
          ref.read(calendarConnectionsProvider).asData?.value ?? [];
      final eventKit = ref.read(eventKitStatusProvider).asData?.value;
      final count = await ref.read(calendarSyncServiceProvider).syncAll(
            connections: connections,
            eventKitStatus: eventKit,
          );
      invalidateCalendarStatus(ref);
      ref.read(calendarDataVersionProvider.notifier).bump();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              count == 0
                  ? 'Nothing to sync. Connect a calendar or reconnect first.'
                  : 'Calendars synced.',
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

  Future<void> _disconnect(String id) async {
    setState(() {
      _error = null;
      _actionId = id;
    });
    try {
      await ref.read(calendarSyncServiceProvider).disconnect(id);
      invalidateCalendarStatus(ref);
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
      _actionId = 'apple';
    });
    try {
      final deviceId = await AppleCalendarService().deviceId();
      await ref.read(calendarConnectionsRepositoryProvider).disconnectEventKit(
            deviceId: deviceId,
            keepEvents: keep,
          );
      invalidateCalendarStatus(ref);
      ref.read(calendarDataVersionProvider.notifier).bump();
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

    final oauth = ref.watch(calendarConnectionsProvider);
    final eventKit = ref.watch(eventKitStatusProvider);
    final rows = buildCalendarProviderRows(
      connections: oauth.asData?.value ?? [],
      eventKitStatus: eventKit.asData?.value,
    );
    final hint = syncAllHint(rows);
    final latest = latestSyncAt(rows);
    final syncing = _actionId == 'sync-all';
    final busy = _actionId != null;

    return FeatureScaffold(
      title: 'Sync',
      body: RefreshIndicator(
        color: DayPilotColors.brand500,
        onRefresh: () async {
          invalidateCalendarStatus(ref);
          await ref.read(calendarConnectionsProvider.future);
          await ref.read(eventKitStatusProvider.future);
          await _incrementalEventKitSync();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            FilledButton.icon(
              onPressed: busy ? null : _syncAll,
              icon: syncing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: DayPilotColors.textInverse,
                      ),
                    )
                  : const Icon(Icons.sync_rounded),
              label: Text(syncing ? 'Syncing…' : 'Sync all'),
            ),
            const SizedBox(height: 8),
            Text(
              switch (hint) {
                SyncAllHint.needsReconnect => 'Needs reconnect',
                SyncAllHint.lastSynced =>
                  'Last synced ${_formatWhen(latest)}',
                SyncAllHint.neverSynced => 'Never synced',
                SyncAllHint.noneConnected => 'Connect a calendar to sync',
              },
              style: const TextStyle(
                color: DayPilotColors.textSecondary,
                fontSize: 13,
              ),
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
            if (oauth.isLoading || eventKit.isLoading)
              const LinearProgressIndicator(color: DayPilotColors.brand500)
            else if (oauth.hasError && eventKit.hasError)
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${oauth.error}',
                    style: const TextStyle(color: DayPilotColors.error),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => invalidateCalendarStatus(ref),
                    child: const Text('Retry'),
                  ),
                ],
              )
            else
              ...rows.map((row) {
                return _ProviderStatusCard(
                  row: row,
                  lastSyncedLabel: _formatWhen(row.lastSynced),
                  busy: busy,
                  connecting: _actionId == row.id,
                  disconnecting: _actionId == (row.connectionId ?? row.id),
                  onConnect: () => _connect(row.id),
                  onReconnect: row.canReconnect ? () => _connect(row.id) : null,
                  onDisconnect: row.id == 'apple' && row.isPresent
                      ? _disconnectEventKit
                      : row.connectionId == null
                          ? null
                          : () => _disconnect(row.connectionId!),
                  onManage: row.id == 'apple' && row.isPresent
                      ? () => context.push('/integrations/apple-calendar')
                      : null,
                );
              }),
          ],
        ),
      ),
    );
  }
}

Color _toneColor(CalendarUiTone tone) {
  switch (tone) {
    case CalendarUiTone.healthy:
      return DayPilotColors.brand500;
    case CalendarUiTone.needsAttention:
      return DayPilotColors.warning;
    case CalendarUiTone.notConnected:
      return DayPilotColors.textTertiary;
  }
}

class _ProviderStatusCard extends StatelessWidget {
  const _ProviderStatusCard({
    required this.row,
    required this.lastSyncedLabel,
    required this.busy,
    required this.connecting,
    required this.disconnecting,
    required this.onConnect,
    required this.onReconnect,
    required this.onDisconnect,
    required this.onManage,
  });

  final CalendarProviderUi row;
  final String lastSyncedLabel;
  final bool busy;
  final bool connecting;
  final bool disconnecting;
  final VoidCallback onConnect;
  final VoidCallback? onReconnect;
  final VoidCallback? onDisconnect;
  final VoidCallback? onManage;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(row.tone);
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
                  row.id == 'apple'
                      ? 'Apple Calendar'
                      : row.id == 'google'
                          ? 'Google Calendar'
                          : 'Outlook / Microsoft 365',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
              ),
              Text(
                row.headline,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: color,
                ),
              ),
            ],
          ),
          if (row.detail.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              row.detail,
              style: const TextStyle(
                color: DayPilotColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
          if (row.isPresent) ...[
            const SizedBox(height: 4),
            Text(
              'Last synced $lastSyncedLabel',
              style: const TextStyle(
                color: DayPilotColors.textTertiary,
                fontSize: 13,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (row.tone == CalendarUiTone.notConnected)
                FilledButton(
                  onPressed: busy ? null : onConnect,
                  child: Text(connecting ? 'Opening…' : 'Connect'),
                )
              else if (row.canReconnect)
                FilledButton(
                  onPressed: busy ? null : onReconnect,
                  child: const Text('Reconnect'),
                ),
              if (onManage != null)
                OutlinedButton(
                  onPressed: busy ? null : onManage,
                  child: const Text('Manage calendars'),
                ),
              if (onDisconnect != null)
                TextButton(
                  onPressed: busy ? null : onDisconnect,
                  style: TextButton.styleFrom(
                    foregroundColor: DayPilotColors.error,
                  ),
                  child: Text(disconnecting ? 'Disconnecting…' : 'Disconnect'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
