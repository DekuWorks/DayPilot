import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../data/repositories/calendar_connections_repository.dart';

const _providers = <({String id, String name, String description})>[
  (
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync events from your Google account.',
  ),
  (
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    description: 'Sync events from Outlook or Microsoft 365.',
  ),
  (
    id: 'apple',
    name: 'Apple / iCloud',
    description: 'Connect your Apple or iCloud calendar (setup coming soon).',
  ),
];

final calendarConnectionsProvider =
    FutureProvider.autoDispose<List<CalendarConnection>>((ref) {
  return ref.watch(calendarConnectionsRepositoryProvider).listConnections();
});

class IntegrationsScreen extends ConsumerStatefulWidget {
  const IntegrationsScreen({super.key});

  @override
  ConsumerState<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends ConsumerState<IntegrationsScreen>
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
      ref.invalidate(calendarConnectionsProvider);
    }
  }

  Future<void> _connect(String provider) async {
    setState(() {
      _error = null;
      _actionId = provider;
    });
    try {
      final url =
          await ref.read(calendarConnectionsRepositoryProvider).getConnectUrl(provider);
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        setState(() => _error = 'Could not open browser for sign-in.');
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Complete sign-in in your browser, then return here. '
              'Your calendar will sync automatically.',
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

  @override
  Widget build(BuildContext context) {
    if (!DayPilotEnv.hasDaypilotApi) {
      return const DayPilotPageShell(
        title: Text('Connected calendars'),
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Calendar connections require the DayPilot API. '
              'Set DAYPILOT_API_URL in dart-define.json.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final async = ref.watch(calendarConnectionsProvider);
    final theme = Theme.of(context);

    return DayPilotPageShell(
      title: const Text('Connected calendars'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Link Google, Outlook, or Apple/iCloud so all your events appear in one calendar.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: DayPilotColors.bodyMuted,
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Card(
                color: theme.colorScheme.errorContainer.withValues(alpha: 0.5),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error!),
                ),
              ),
            ],
            const SizedBox(height: 16),
            async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('$e'),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => ref.invalidate(calendarConnectionsProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
              data: (connections) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Your connections',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: DayPilotColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (connections.isEmpty)
                    Text(
                      'No calendars connected yet. Connect one below.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: DayPilotColors.bodyMuted,
                      ),
                    )
                  else
                    ...connections.map(
                      (c) => _ConnectionTile(
                        connection: c,
                        busy: _actionId != null,
                        syncing: _actionId == 'sync-${c.id}',
                        disconnecting: _actionId == c.id,
                        onSync: () => _sync(c.id),
                        onDisconnect: () => _disconnect(c.id),
                      ),
                    ),
                  const SizedBox(height: 24),
                  Text(
                    'Add a calendar',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: DayPilotColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ..._providers.map((p) {
                    final connected =
                        connections.any((c) => c.provider == p.id);
                    return _ProviderTile(
                      name: p.name,
                      description: p.description,
                      connected: connected,
                      busy: _actionId != null,
                      connecting: _actionId == p.id,
                      onConnect: () => _connect(p.id),
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

class _ConnectionTile extends StatelessWidget {
  const _ConnectionTile({
    required this.connection,
    required this.busy,
    required this.syncing,
    required this.disconnecting,
    required this.onSync,
    required this.onDisconnect,
  });

  final CalendarConnection connection;
  final bool busy;
  final bool syncing;
  final bool disconnecting;
  final VoidCallback onSync;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              connection.provider[0].toUpperCase() + connection.provider.substring(1),
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              connection.email,
              style: theme.textTheme.bodySmall?.copyWith(
                color: DayPilotColors.bodyMuted,
              ),
            ),
            if (connection.syncedAt != null)
              Text(
                'Synced ${MaterialLocalizations.of(context).formatShortDate(connection.syncedAt!.toLocal())}',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: DayPilotColors.bodyMuted,
                ),
              ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                OutlinedButton(
                  onPressed: busy ? null : onSync,
                  child: Text(syncing ? 'Syncing…' : 'Sync now'),
                ),
                TextButton(
                  onPressed: busy ? null : onDisconnect,
                  style: TextButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                  ),
                  child: Text(disconnecting ? 'Disconnecting…' : 'Disconnect'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProviderTile extends StatelessWidget {
  const _ProviderTile({
    required this.name,
    required this.description,
    required this.connected,
    required this.busy,
    required this.connecting,
    required this.onConnect,
  });

  final String name;
  final String description;
  final bool connected;
  final bool busy;
  final bool connecting;
  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    description,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: DayPilotColors.bodyMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (connected)
              Text(
                'Connected',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: DayPilotColors.teal,
                  fontWeight: FontWeight.w600,
                ),
              )
            else
              OutlinedButton(
                onPressed: busy ? null : onConnect,
                child: Text(connecting ? 'Opening…' : 'Connect'),
              ),
          ],
        ),
      ),
    );
  }
}
