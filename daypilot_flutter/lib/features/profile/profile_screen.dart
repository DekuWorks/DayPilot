import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_connection_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_mode_provider.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../core/widgets/profile_avatar.dart';
import '../../core/widgets/sso_brand_button.dart';
import '../../data/services/avatar_upload_service.dart';
import '../../domain/calendar/calendar_connection_ui.dart';
import 'profile_providers.dart';

/// Profile tab — hub for the same product areas as daypilot.co.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentProfileProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final email = user?.email ?? '';

    final colors = context.dp;
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Profile',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: colors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            profile.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('$e'),
              data: (p) {
                final display = profileDisplayName(p, email);
                final username = (p?['username'] as String?)?.trim();
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colors.surfacePrimary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      ProfileAvatar(
                        initials: profileInitials(display),
                        imageUrl: profileAvatarUrl(p),
                        radius: 28,
                        onTap: () => _pickAndUploadAvatar(context, ref),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: InkWell(
                          onTap: () => context.push('/settings'),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                display,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                  color: colors.textPrimary,
                                ),
                              ),
                              if (username != null && username.isNotEmpty)
                                Text(
                                  '@$username',
                                  style: TextStyle(
                                    color: colors.accent,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              Text(
                                email,
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Edit profile',
                        onPressed: () => context.push('/settings'),
                        icon: Icon(
                          Icons.edit_outlined,
                          color: colors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 4),
              title: Text(
                'Light mode',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: colors.textPrimary,
                ),
              ),
              value: themeMode == ThemeMode.light,
              activeThumbColor: colors.accent,
              onChanged: (v) =>
                  ref.read(themeModeProvider.notifier).setLight(v),
            ),
            const SizedBox(height: 16),
            Text(
              'Sync',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            const _CalendarConnectionsCard(),
            const SizedBox(height: 8),
            const _SyncAllTile(),
            const SizedBox(height: 24),
            Text(
              'Workspace',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.sticky_note_2_outlined,
              title: 'Notes',
              onTap: () => context.push('/notes'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.folder_outlined,
              title: 'Projects',
              onTap: () => context.push('/projects'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.videocam_outlined,
              title: 'Meetings',
              onTap: () => context.push('/meetings'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.contacts_outlined,
              title: 'Contacts',
              onTap: () => context.push('/contacts'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.people_outline_rounded,
              title: 'Friends',
              onTap: () => context.push('/friends'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.auto_awesome_rounded,
              title: 'Pilot Brief',
              onTap: () => context.push('/insights/brief'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.event_available_outlined,
              title: 'Booking links',
              onTap: () => context.push('/booking-links'),
            ),
            const SizedBox(height: 24),
            Text(
              'Account',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.search_rounded,
              title: 'Search',
              onTap: () => context.push('/search'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.settings_outlined,
              title: 'Settings',
              onTap: () => context.push('/settings'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () => context.push('/notifications'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.link_rounded,
              title: 'Connected calendars',
              subtitle: 'Manage Google, Outlook, Apple',
              onTap: () => context.push('/sync'),
            ),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.credit_card_rounded,
              title: 'Billing',
              onTap: () => context.push('/billing'),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () async {
                await ref.read(authRepositoryProvider).signOut();
                if (context.mounted) context.go('/login');
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _pickAndUploadAvatar(BuildContext context, WidgetRef ref) async {
  final service = AvatarUploadService(ref.read(supabaseClientProvider));
  try {
    final picked = await service.pickFromGallery();
    if (picked == null) return;
    await service.uploadPicked(picked);
    ref.invalidate(currentProfileProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Photo saved.')),
      );
    }
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    }
  }
}

Color _toneColor(BuildContext context, CalendarUiTone tone) {
  switch (tone) {
    case CalendarUiTone.healthy:
      return DayPilotScheme.of(context).accent;
    case CalendarUiTone.needsAttention:
      return DayPilotColors.warning;
    case CalendarUiTone.notConnected:
      return const Color(0xFF6B7380);
  }
}

IconData _toneIcon(CalendarUiTone tone) {
  switch (tone) {
    case CalendarUiTone.healthy:
      return Icons.check_circle_rounded;
    case CalendarUiTone.needsAttention:
      return Icons.error_outline_rounded;
    case CalendarUiTone.notConnected:
      return Icons.radio_button_unchecked;
  }
}

String _formatSyncWhen(BuildContext context, DateTime? dt) {
  if (dt == null) return 'Never';
  final local = dt.toLocal();
  final d = MaterialLocalizations.of(context);
  return '${d.formatShortDate(local)} ${d.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
}

List<CalendarProviderUi> _rowsFromProviders(WidgetRef ref) {
  final connections =
      ref.watch(calendarConnectionsProvider).asData?.value ?? [];
  final eventKit = ref.watch(eventKitStatusProvider).asData?.value;
  return buildCalendarProviderRows(
    connections: connections,
    eventKitStatus: eventKit,
  );
}

/// Google / Outlook / Apple — Apple is EventKit, not Sign in with Apple.
class _CalendarConnectionsCard extends ConsumerWidget {
  const _CalendarConnectionsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!DayPilotEnv.hasDaypilotApi) {
      return NavTile(
        icon: Icons.cloud_off_outlined,
        title: 'Sync unavailable',
        subtitle: 'Calendar sync is temporarily unavailable',
        onTap: () => context.push('/sync'),
      );
    }

    final oauth = ref.watch(calendarConnectionsProvider);
    final eventKit = ref.watch(eventKitStatusProvider);
    final loading = oauth.isLoading || eventKit.isLoading;
    final failed = oauth.hasError && eventKit.hasError;

    return InkWell(
      onTap: () => context.push('/sync'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DayPilotScheme.of(context).surfacePrimary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
        ),
        child: loading
            ? LinearProgressIndicator(
                color: DayPilotScheme.of(context).accent,
                minHeight: 2,
              )
            : failed
                ? Text(
                    'Could not load sync status — tap to open Sync',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).textSecondary,
                      fontSize: 13,
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Calendar connections',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: DayPilotScheme.of(context).textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ..._rowsFromProviders(ref).map(
                        (row) => _ProviderStatusRow(row: row),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _ProviderStatusRow extends ConsumerWidget {
  const _ProviderStatusRow({required this.row});

  final CalendarProviderUi row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _toneColor(context, row.tone);
    final detail = row.detail.isEmpty ? row.headline : row.detail;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(_toneIcon(row.tone), size: 18, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  row.name,
                  style: TextStyle(
                    color: DayPilotScheme.of(context).textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  row.tone == CalendarUiTone.healthy
                      ? detail
                      : row.tone == CalendarUiTone.needsAttention
                          ? [
                              if (row.detail.isNotEmpty) row.detail,
                              row.headline,
                            ].join(' · ')
                          : row.headline,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (row.canReconnect && ssoBrandForProvider(row.id) != null)
            SizedBox(
              width: 200,
              child: SsoBrandButton(
                brand: ssoBrandForProvider(row.id)!,
                label: ssoConnectLabel(row.id, reconnect: true),
                expand: true,
                onPressed: () => _reconnect(context, ref, row),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _reconnect(
    BuildContext context,
    WidgetRef ref,
    CalendarProviderUi row,
  ) async {
    if (row.id == 'apple') {
      context.push('/integrations/apple-calendar');
      return;
    }
    try {
      final launched =
          await ref.read(calendarSyncServiceProvider).launchConnect(row.id);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open browser for sign-in.')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }
}

class _SyncAllTile extends ConsumerStatefulWidget {
  const _SyncAllTile();

  @override
  ConsumerState<_SyncAllTile> createState() => _SyncAllTileState();
}

class _SyncAllTileState extends ConsumerState<_SyncAllTile> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    if (!DayPilotEnv.hasDaypilotApi) {
      return const SizedBox.shrink();
    }

    final rows = _rowsFromProviders(ref);
    final hint = syncAllHint(rows);
    final latest = latestSyncAt(rows);
    final subtitle = switch (hint) {
      SyncAllHint.needsReconnect => 'Needs reconnect',
      SyncAllHint.lastSynced => 'Last synced ${_formatSyncWhen(context, latest)}',
      SyncAllHint.neverSynced => 'Never synced',
      SyncAllHint.noneConnected => 'Connect a calendar to sync',
    };

    return Material(
      color: DayPilotScheme.of(context).surfacePrimary,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: _busy ? null : _syncAll,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
          ),
          child: Row(
            children: [
              Icon(
                Icons.sync_rounded,
                color: _busy
                    ? DayPilotScheme.of(context).textTertiary
                    : DayPilotScheme.of(context).accent,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _busy ? 'Syncing…' : 'Sync all',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: DayPilotScheme.of(context).textPrimary,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: DayPilotScheme.of(context).textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (_busy)
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: DayPilotScheme.of(context).accent,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _syncAll() async {
    setState(() => _busy = true);
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
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            count == 0
                ? 'Nothing to sync. Connect a calendar or reconnect first.'
                : 'Calendars synced.',
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
