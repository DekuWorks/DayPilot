import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../data/repositories/calendar_connections_repository.dart';
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
    id: 'apple',
    name: 'Apple / iCloud Calendar',
    description:
        'CalDAV with Apple ID + app-specific password. Sign in with Apple cannot grant calendar access.',
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
    if (provider == 'apple') {
      await _connectAppleCalDav();
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

  Future<void> _linkAppleSso() async {
    setState(() {
      _error = null;
      _actionId = 'apple-sso';
    });
    try {
      await ref.read(authRepositoryProvider).signInWithApple();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Complete Sign in with Apple, then return here to connect iCloud Calendar with an app-specific password.',
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

  Future<void> _connectAppleCalDav() async {
    final prefill =
        ref.read(authRepositoryProvider).appleIdEmailForCalDav ?? '';
    final appleIdCtrl = TextEditingController(text: prefill);
    final passwordCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Connect iCloud Calendar'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create an app-specific password at appleid.apple.com '
                '(Sign-In and Security → App-Specific Passwords). '
                '2FA required. Gmail Apple IDs work. Spaces are stripped. '
                'This is not Sign in with Apple.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: appleIdCtrl,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.username],
                decoration: const InputDecoration(
                  labelText: 'Apple ID email',
                  hintText: 'you@gmail.com or you@icloud.com',
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: passwordCtrl,
                obscureText: true,
                autocorrect: false,
                enableSuggestions: false,
                decoration: const InputDecoration(
                  labelText: 'App-specific password',
                  hintText: 'xxxx-xxxx-xxxx-xxxx',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Connect & sync'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      appleIdCtrl.dispose();
      passwordCtrl.dispose();
      return;
    }
    final appleId = appleIdCtrl.text.trim();
    final password =
        CalendarConnectionsRepository.normalizeAppSpecificPassword(
      passwordCtrl.text,
    );
    appleIdCtrl.dispose();
    passwordCtrl.dispose();
    if (appleId.isEmpty || password.isEmpty) {
      setState(() => _error = 'Apple ID and app-specific password required.');
      return;
    }
    setState(() {
      _error = null;
      _actionId = 'apple';
    });
    try {
      await ref.read(calendarConnectionsRepositoryProvider).connectAppleCalDav(
            appleId: appleId,
            appSpecificPassword: password,
          );
      ref.invalidate(calendarConnectionsProvider);
      ref.read(calendarDataVersionProvider.notifier).bump();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'iCloud Calendar connected. Events will appear on Calendar.',
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

    return FeatureScaffold(
      title: 'Sync',
      body: RefreshIndicator(
        color: DayPilotColors.brand500,
        onRefresh: () async {
          ref.invalidate(calendarConnectionsProvider);
          await ref.read(calendarConnectionsProvider.future);
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
            _AppleAuthCard(
              linked: ref.read(authRepositoryProvider).hasAppleIdentity,
              busy: _actionId != null,
              linking: _actionId == 'apple-sso',
              onLinkApple: _linkAppleSso,
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
                  ..._providers.map((p) {
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
                              (p.id == 'apple' ||
                                  conn.status ==
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

class _AppleAuthCard extends StatelessWidget {
  const _AppleAuthCard({
    required this.linked,
    required this.busy,
    required this.linking,
    required this.onLinkApple,
  });

  final bool linked;
  final bool busy;
  final bool linking;
  final VoidCallback onLinkApple;

  @override
  Widget build(BuildContext context) {
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
          const Text(
            'Apple Sign-In (account)',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: DayPilotColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Account SSO. Linking can prefill your Apple ID for CalDAV — '
            'an app-specific password is still required for iCloud Calendar.',
            style: TextStyle(
              color: DayPilotColors.textSecondary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Sign in with Apple',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
              ),
              if (linked)
                const Text(
                  'Linked',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: DayPilotColors.brand500,
                  ),
                )
              else
                OutlinedButton(
                  onPressed: busy ? null : onLinkApple,
                  child: Text(linking ? 'Opening…' : 'Sign in with Apple'),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            linked
                ? 'Linked to this DayPilot account.'
                : 'Not linked — tap Sign in with Apple, then Connect iCloud below.',
            style: const TextStyle(
              color: DayPilotColors.textSecondary,
              fontSize: 13,
            ),
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
            _MetaRow(label: 'Account', value: connection!.email.isEmpty
                ? '—'
                : connection!.email),
            _MetaRow(
              label: 'Validation',
              value: connection!.status.label,
              valueColor: statusColor(connection!.status),
            ),
            _MetaRow(
              label: 'Last synced',
              value: formatWhen(connection!.syncedAt),
            ),
            _MetaRow(
              label: 'Last validated',
              value: formatWhen(connection!.validatedAt),
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
              child: Text(
                connecting
                    ? (name.contains('iCloud') ? 'Connecting…' : 'Opening…')
                    : calendarReady
                        ? (name.contains('iCloud')
                            ? 'Connect iCloud'
                            : 'Connect')
                        : 'Calendar connect (coming soon)',
              ),
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
