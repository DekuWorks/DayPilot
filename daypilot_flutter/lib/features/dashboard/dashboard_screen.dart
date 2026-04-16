import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/gradient_brand_title.dart';
import '../calendar/calendar_panel.dart';

/// Single signed-in home: DayPilot marketing look (cream gradient) + calendar.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final email =
        Supabase.instance.client.auth.currentUser?.email ?? 'there';
    final shortName = email.contains('@') ? email.split('@').first : email;
    final apiSync = ref.watch(apiSessionSyncProvider);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            DayPilotColors.cream,
            DayPilotColors.creamLight,
            DayPilotColors.cream,
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (apiSync.status == ApiSessionSyncStatus.syncing)
                const LinearProgressIndicator(minHeight: 2),
              if (apiSync.showDashboardBanner)
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Card(
                    elevation: 0,
                    color: Theme.of(context)
                        .colorScheme
                        .errorContainer
                        .withValues(alpha: 0.45),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.warning_amber_rounded,
                                color: Theme.of(context).colorScheme.error,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _formatApiErrorForBanner(apiSync.error),
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            alignment: WrapAlignment.end,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              TextButton(
                                onPressed: () => ref
                                    .read(apiSessionSyncProvider.notifier)
                                    .sync(),
                                child: const Text('Retry'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  await ref
                                      .read(authRepositoryProvider)
                                      .signOut();
                                  if (context.mounted) context.go('/login');
                                },
                                child: const Text('Sign out'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const GradientBrandTitle(fontSize: 24),
                          const SizedBox(height: 4),
                          Text(
                            '${_greeting()}, $shortName',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                              color: DayPilotColors.bodyMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Insights',
                      icon: const Icon(Icons.insights_outlined),
                      onPressed: () => context.push('/insights'),
                    ),
                    IconButton(
                      tooltip: 'New event',
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => context.push('/events/new'),
                    ),
                    PopupMenuButton<String>(
                      tooltip: 'Account',
                      onSelected: (value) async {
                        if (value == 'out') {
                          await ref.read(authRepositoryProvider).signOut();
                          if (context.mounted) context.go('/login');
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'out', child: Text('Sign out')),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: ColoredBox(
                      color: Theme.of(context)
                          .colorScheme
                          .surface
                          .withValues(alpha: 0.94),
                      child: const CalendarPanel(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatApiErrorForBanner(Object? error) {
  if (error == null) {
    return 'Could not connect to the DayPilot server. Check the API URL and that the server is running.';
  }
  final s = error.toString();
  if (s.length > 160) return '${s.substring(0, 157)}…';
  return s;
}
