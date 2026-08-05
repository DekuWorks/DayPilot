import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../data/repositories/calendar_connections_repository.dart';
import '../integrations/integrations_screen.dart';

final _profileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  return client
      .from('profiles')
      .select(
        'first_name, last_name, username, display_name, name, email',
      )
      .eq('id', uid)
      .maybeSingle();
});

/// Profile tab — hub for the same product areas as daypilot.co.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(_profileProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final email = user?.email ?? '';

    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text(
              'Profile',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: DayPilotColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            profile.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('$e'),
              data: (p) {
                final first = (p?['first_name'] as String?)?.trim() ?? '';
                final last = (p?['last_name'] as String?)?.trim() ?? '';
                final name = [first, last].where((s) => s.isNotEmpty).join(' ');
                final display = name.isNotEmpty
                    ? name
                    : ((p?['display_name'] as String?)?.trim().isNotEmpty ==
                            true
                        ? p!['display_name'] as String
                        : email.split('@').first);
                final username = (p?['username'] as String?)?.trim();
                return InkWell(
                  onTap: () => context.push('/settings'),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: DayPilotColors.surfacePrimary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: DayPilotColors.borderSubtle),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor:
                              DayPilotColors.brand500.withValues(alpha: 0.2),
                          child: Text(
                            display.isNotEmpty
                                ? display[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: DayPilotColors.brand500,
                              fontWeight: FontWeight.w800,
                              fontSize: 22,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                display,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                  color: DayPilotColors.textPrimary,
                                ),
                              ),
                              if (username != null && username.isNotEmpty)
                                Text(
                                  '@$username',
                                  style: const TextStyle(
                                    color: DayPilotColors.brand500,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              Text(
                                email,
                                style: const TextStyle(
                                  color: DayPilotColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.edit_outlined,
                          color: DayPilotColors.textTertiary,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              'Sync',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            const _SyncStatusCard(),
            const SizedBox(height: 8),
            NavTile(
              icon: Icons.sync_rounded,
              title: 'Calendar sync',
              subtitle: 'Status, validate, sync now',
              onTap: () => context.push('/sync'),
            ),
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
              subtitle: 'Integrations setup',
              onTap: () => context.push('/integrations'),
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

/// Compact Google / Outlook / Apple connection chips for the Profile hub.
class _SyncStatusCard extends ConsumerWidget {
  const _SyncStatusCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!DayPilotEnv.hasDaypilotApi) {
      return NavTile(
        icon: Icons.cloud_off_outlined,
        title: 'API not configured',
        subtitle: 'Set DAYPILOT_API_URL to enable sync',
        onTap: () => context.push('/sync'),
      );
    }

    final async = ref.watch(calendarConnectionsProvider);
    return InkWell(
      onTap: () => context.push('/sync'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DayPilotColors.surfacePrimary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DayPilotColors.borderSubtle),
        ),
        child: async.when(
          loading: () => const LinearProgressIndicator(
            color: DayPilotColors.brand500,
            minHeight: 2,
          ),
          error: (_, _) => const Text(
            'Could not load sync status — tap to open Sync',
            style: TextStyle(color: DayPilotColors.textSecondary, fontSize: 13),
          ),
          data: (connections) {
            const providers = ['google', 'outlook', 'apple'];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Calendar connections',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: DayPilotColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                ...providers.map((id) {
                  CalendarConnection? conn;
                  for (final c in connections) {
                    if (c.provider == id) {
                      conn = c;
                      break;
                    }
                  }
                  final label = id[0].toUpperCase() + id.substring(1);
                  final connected = conn != null;
                  final statusText = !connected
                      ? 'Not connected'
                      : conn.status.label;
                  final color = !connected
                      ? DayPilotColors.textTertiary
                      : conn.status == ConnectionValidationStatus.valid
                          ? DayPilotColors.brand500
                          : conn.status ==
                                  ConnectionValidationStatus.needsReconnect
                              ? DayPilotColors.error
                              : DayPilotColors.warning;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Icon(
                          connected
                              ? Icons.check_circle_rounded
                              : Icons.radio_button_unchecked,
                          size: 18,
                          color: color,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            label,
                            style: const TextStyle(
                              color: DayPilotColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Flexible(
                          child: Text(
                            connected && conn.email.isNotEmpty
                                ? '${conn.email} · $statusText'
                                : statusText,
                            textAlign: TextAlign.end,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: color,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
    );
  }
}
