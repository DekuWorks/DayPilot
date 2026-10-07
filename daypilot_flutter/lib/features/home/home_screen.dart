import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/profile_avatar.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_panel.dart';
import '../calendar/calendar_providers.dart';
import '../calendar/calendar_view_mode.dart';
import '../calendar/empty_schedule_hint.dart';
import '../founder_hub/founder_hub_home_button.dart';
import '../profile/profile_providers.dart';

final _homeNextEventProvider =
    FutureProvider.autoDispose<EventRecord?>((ref) async {
  ref.watch(calendarDataVersionProvider);
  final now = DateTime.now();
  final start = DateTime(now.year, now.month, now.day);
  final end = start.add(const Duration(days: 2));
  final events = await loadEventsForRange(ref, from: start, to: end);
  final upcoming = events.where((e) => !e.endsAt.isBefore(now)).toList()
    ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  if (upcoming.isEmpty) return null;
  return upcoming.first;
});

/// Home tab — compact greeting + optional next-event line + calendar.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.dp;
    final profile = ref.watch(currentProfileProvider);
    final nextAsync = ref.watch(_homeNextEventProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final view = parseCalendarViewMode(
      GoRouterState.of(context).uri.queryParameters['view'],
    );

    final firstName = profile.maybeWhen(
      data: (p) => profileGreetingFirstName(p, user?.userMetadata),
      orElse: () => profileGreetingFirstName(null, user?.userMetadata),
    );
    final initials = profileInitials(firstName);
    final avatarUrl = profile.maybeWhen(
      data: (p) => resolveAvatarUrl(p, user),
      orElse: () => authMetadataAvatarUrl(user),
    );
    final next = nextAsync.maybeWhen(
      data: (event) => event,
      orElse: () => null,
    );
    final upcomingEmpty = nextAsync.maybeWhen(
      data: (event) => event == null,
      orElse: () => false,
    );
    final sync = ref.watch(apiSessionSyncProvider);

    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        bottom: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 2, 4, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${_greeting()}, $firstName',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push('/insights/brief'),
                    child: const Text('Pilot Brief'),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    visualDensity: VisualDensity.compact,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    padding: EdgeInsets.zero,
                    onPressed: () => context.push('/notifications'),
                    icon: const Icon(Icons.notifications_outlined, size: 20),
                    color: colors.textSecondary,
                  ),
                  IconButton(
                    tooltip: 'New event',
                    visualDensity: VisualDensity.compact,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    padding: EdgeInsets.zero,
                    onPressed: () => context.push('/events/new'),
                    icon: const Icon(Icons.add_circle_rounded, size: 22),
                    color: colors.accent,
                  ),
                  GestureDetector(
                    onTap: () => context.go('/profile'),
                    child: ProfileAvatar(
                      initials: initials,
                      imageUrl: avatarUrl,
                      radius: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
            if (next != null)
              GestureDetector(
                onTap: () => context.push('/events/${next.id}'),
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 2),
                  child: Text(
                    '${DateFormat.jm().format(next.startsAt)} · ${next.title}',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      height: 1.2,
                      color: colors.accent,
                    ),
                  ),
                ),
              ),
            if (DayPilotEnv.hasDaypilotApi && sync.showDashboardBanner)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Calendar sync is not ready yet.',
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      'Your events will load after DayPilot accepts this sign-in. You can retry.',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: () => ref
                            .read(apiSessionSyncProvider.notifier)
                            .sync(),
                        child: const Text('Retry'),
                      ),
                    ),
                  ],
                ),
              ),
            if (upcomingEmpty && user != null)
              _TodayPlanPrompt(userId: user.id),
            const FounderHubHomeButton(),
            Expanded(
              child: CalendarPanel(initialView: view),
            ),
          ],
        ),
      ),
    );
  }
}

class _TodayPlanPrompt extends ConsumerStatefulWidget {
  const _TodayPlanPrompt({required this.userId});

  final String userId;

  @override
  ConsumerState<_TodayPlanPrompt> createState() => _TodayPlanPromptState();
}

class _TodayPlanPromptState extends ConsumerState<_TodayPlanPrompt> {
  static String _key(String userId) => 'today_plan_prompt_dismissed_$userId';

  late bool _hidden;

  @override
  void initState() {
    super.initState();
    _hidden =
        ref.read(sharedPreferencesProvider).getBool(_key(widget.userId)) ==
            true;
  }

  @override
  Widget build(BuildContext context) {
    if (_hidden) return const SizedBox.shrink();
    return EmptyScheduleHint(
      compact: true,
      title: 'Nothing in the next two days.',
      body:
          'Add a task you still need to do, or connect a calendar when you want the plan to include commitments you already have.',
      primaryLabel: 'Add a task',
      onPrimary: () => context.go('/tasks'),
      secondaryLabel: 'Connect a calendar',
      onSecondary: () => context.push('/sync'),
      dismissLabel: 'Not now',
      onDismiss: () async {
        await ref
            .read(sharedPreferencesProvider)
            .setBool(_key(widget.userId), true);
        if (mounted) setState(() => _hidden = true);
      },
    );
  }
}
