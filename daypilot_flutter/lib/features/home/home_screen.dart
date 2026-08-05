import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_error_view.dart';
import '../tasks/tasks_screen.dart';

final _homeEventsProvider =
    FutureProvider.autoDispose<List<EventRecord>>((ref) {
  ref.watch(calendarDataVersionProvider);
  final now = DateTime.now();
  final start = DateTime(now.year, now.month, now.day);
  final end = start.add(const Duration(days: 1));
  return ref
      .watch(eventRepositoryProvider)
      .listForRange(from: start, to: end);
});

final _homeProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  return client
      .from('profiles')
      .select('first_name, last_name, username, display_name, name, email')
      .eq('id', uid)
      .maybeSingle();
});

final _homeUpcomingTasksProvider =
    FutureProvider.autoDispose<List<TaskRow>>((ref) async {
  final tasks = await ref.watch(tasksListProvider.future);
  final now = DateTime.now();
  final dayStart = DateTime(now.year, now.month, now.day);
  return tasks
      .where((t) => !t.isDone && t.status != 'cancelled')
      .where((t) {
        if (t.dueAt == null) return true;
        return !t.dueAt!.isBefore(dayStart);
      })
      .take(3)
      .toList();
});

/// Home tab — greeting, week strip, today's schedule, new event CTA (mockup).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Color _accentFor(int index) {
    const accents = [
      DayPilotColors.brand500,
      DayPilotColors.meetings,
      DayPilotColors.projects,
      DayPilotColors.warning,
      DayPilotColors.focus,
    ];
    return accents[index % accents.length];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(_homeProfileProvider);
    final events = ref.watch(_homeEventsProvider);
    final upcoming = ref.watch(_homeUpcomingTasksProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final firstName = profile.maybeWhen(
      data: (p) {
        final f = (p?['first_name'] as String?)?.trim();
        if (f != null && f.isNotEmpty) return f;
        final d = (p?['display_name'] as String?)?.trim();
        if (d != null && d.isNotEmpty) return d.split(' ').first;
        final email = p?['email'] as String? ?? user?.email;
        return email?.split('@').first ?? 'there';
      },
      orElse: () => 'there',
    );
    final initials = firstName.isNotEmpty
        ? firstName.substring(0, 1).toUpperCase()
        : 'D';

    final today = DateTime.now();
    // Mon-start week strip like the mockup
    final weekStart = today.subtract(Duration(days: today.weekday - 1));

    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: SafeArea(
        child: RefreshIndicator(
          color: DayPilotColors.brand500,
          onRefresh: () async {
            ref.read(calendarDataVersionProvider.notifier).bump();
            ref.invalidate(_homeEventsProvider);
            ref.invalidate(_homeProfileProvider);
            ref.invalidate(_homeUpcomingTasksProvider);
            ref.invalidate(tasksListProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_greeting()}, $firstName 👋',
                          style:
                              Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: DayPilotColors.textPrimary,
                                    letterSpacing: -0.3,
                                  ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('EEEE, MMMM d').format(today),
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: DayPilotColors.textSecondary,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    onPressed: () => context.push('/notifications'),
                    icon: const Icon(Icons.notifications_outlined),
                    color: DayPilotColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => context.go('/profile'),
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor:
                          DayPilotColors.brand500.withValues(alpha: 0.2),
                      child: Text(
                        initials,
                        style: const TextStyle(
                          color: DayPilotColors.brand500,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 78,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: 7,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, i) {
                    final day = weekStart.add(Duration(days: i));
                    final isToday = day.year == today.year &&
                        day.month == today.month &&
                        day.day == today.day;
                    return InkWell(
                      onTap: () => context.go('/calendar'),
                      borderRadius: BorderRadius.circular(40),
                      child: SizedBox(
                        width: 44,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              DateFormat('E').format(day).substring(0, 1),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isToday
                                    ? DayPilotColors.brand500
                                    : DayPilotColors.textTertiary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              width: 40,
                              height: 40,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isToday
                                    ? DayPilotColors.brand500
                                    : Colors.transparent,
                                border: isToday
                                    ? null
                                    : Border.all(
                                        color: DayPilotColors.borderSubtle,
                                      ),
                              ),
                              child: Text(
                                '${day.day}',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: isToday
                                      ? DayPilotColors.textInverse
                                      : DayPilotColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Text(
                    "Today's Schedule",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/calendar'),
                    style: TextButton.styleFrom(
                      foregroundColor: DayPilotColors.brand500,
                    ),
                    child: const Text('View all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              events.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => CalendarErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(_homeEventsProvider),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: DayPilotColors.surfacePrimary,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: DayPilotColors.borderSubtle),
                      ),
                      child: Text(
                        'Nothing on your calendar today. Add an event to get started.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: DayPilotColors.textSecondary,
                            ),
                      ),
                    );
                  }
                  return Column(
                    children: [
                      for (var i = 0; i < list.length; i++) ...[
                        _EventCard(
                          event: list[i],
                          accent: _accentFor(i),
                        ),
                        const SizedBox(height: 10),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => context.push('/events/new'),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('+ New Event'),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Text(
                    'Upcoming',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/tasks'),
                    style: TextButton.styleFrom(
                      foregroundColor: DayPilotColors.brand500,
                    ),
                    child: const Text('View all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              upcoming.when(
                loading: () => const SizedBox.shrink(),
                error: (_, _) => const SizedBox.shrink(),
                data: (tasks) {
                  if (tasks.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: DayPilotColors.surfacePrimary,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: DayPilotColors.borderSubtle),
                      ),
                      child: const Text(
                        'No upcoming tasks.',
                        style: TextStyle(color: DayPilotColors.textSecondary),
                      ),
                    );
                  }
                  return Column(
                    children: [
                      for (final t in tasks) ...[
                        _UpcomingTaskCard(task: t),
                        const SizedBox(height: 8),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => context.push('/insights/brief'),
                icon: const Icon(Icons.auto_awesome_rounded, size: 18),
                label: const Text('Open Pilot Brief'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event, required this.accent});

  final EventRecord event;
  final Color accent;

  IconData _sourceIcon() {
    final loc = (event.location ?? '').toLowerCase();
    final title = event.title.toLowerCase();
    if (loc.contains('zoom') || title.contains('zoom')) {
      return Icons.videocam_rounded;
    }
    if (loc.contains('meet') || title.contains('meet')) {
      return Icons.video_call_rounded;
    }
    return Icons.event_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final time = DateFormat.jm().format(event.startsAt);
    final end = DateFormat.jm().format(event.endsAt);
    return InkWell(
      onTap: () => context.push('/events/${event.id}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: DayPilotColors.surfacePrimary,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: DayPilotColors.borderSubtle),
        ),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 76,
              decoration: BoxDecoration(
                color: accent,
                borderRadius:
                    const BorderRadius.horizontal(left: Radius.circular(14)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$time – $end',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: accent,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: DayPilotColors.textPrimary,
                        fontSize: 16,
                      ),
                    ),
                    if ((event.location ?? '').isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        event.location!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: DayPilotColors.textTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: Icon(
                _sourceIcon(),
                size: 20,
                color: DayPilotColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingTaskCard extends StatelessWidget {
  const _UpcomingTaskCard({required this.task});

  final TaskRow task;

  String _dueLabel() {
    if (task.dueAt == null) return 'Anytime';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(task.dueAt!.year, task.dueAt!.month, task.dueAt!.day);
    final diff = due.difference(today).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    return DateFormat.MMMd().format(task.dueAt!);
  }

  @override
  Widget build(BuildContext context) {
    final isToday = _dueLabel() == 'Today';
    return InkWell(
      onTap: () => context.push('/tasks/${task.id}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: DayPilotColors.surfacePrimary,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: DayPilotColors.borderSubtle),
        ),
        child: Row(
          children: [
            Icon(
              Icons.circle_outlined,
              size: 22,
              color: DayPilotColors.textTertiary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                task.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: DayPilotColors.textPrimary,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isToday
                    ? DayPilotColors.brand500.withValues(alpha: 0.15)
                    : DayPilotColors.surfaceSecondary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _dueLabel(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isToday
                      ? DayPilotColors.brand500
                      : DayPilotColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
