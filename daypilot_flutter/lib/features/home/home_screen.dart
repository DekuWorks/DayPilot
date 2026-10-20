import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/profile_avatar.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_chip_color.dart';
import '../calendar/calendar_providers.dart';
import '../calendar/empty_schedule_hint.dart';
import '../founder_hub/founder_hub_home_button.dart';
import '../profile/profile_providers.dart';
import '../tasks/tasks_screen.dart';
import 'today_providers.dart';
import 'today_summary.dart';

/// Today tab: greeting, week strip, real counts, the day's schedule and tasks.
///
/// Every number comes from events, tasks or focus sessions. When a source
/// fails the card says "Unavailable" rather than showing a placeholder.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late DateTime _selected = _dateOnly(DateTime.now());

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  String _greeting() {
    final h = DateTime.now().hour;
    // Late night should not say "Good morning".
    if (h < 5) return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  bool get _isToday => _selected == _dateOnly(DateTime.now());

  Future<void> _toggleTask(TaskRow task) async {
    final done = task.isDone;
    await ref
        .read(supabaseClientProvider)
        .from('tasks')
        .update({
          'status': done ? 'pending' : 'completed',
          'completed_at': done ? null : DateTime.now().toIso8601String(),
        })
        .eq('id', task.id);
    ref.invalidate(tasksListProvider);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final profile = ref.watch(currentProfileProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final events = ref.watch(calendarDayEventsFamily(_selected));
    final tasks = ref.watch(tasksListProvider);
    final focus = ref.watch(todayFocusSecondsProvider);
    final sync = ref.watch(apiSessionSyncProvider);

    final firstName = profile.maybeWhen(
      data: (p) => profileGreetingFirstName(p, user?.userMetadata),
      orElse: () => profileGreetingFirstName(null, user?.userMetadata),
    );
    final initials = profileInitials(firstName);
    final avatarUrl = profile.maybeWhen(
      data: (p) => resolveAvatarUrl(p, user),
      orElse: () => authMetadataAvatarUrl(user),
    );

    final summary = tasks.maybeWhen(
      data: (rows) => summariseTodayTasks(rows, DateTime.now()),
      orElse: () => null,
    );
    final taskCard = tasks.when(
      loading: () => const _StatValue.loading(),
      error: (_, _) => const _StatValue.unavailable(),
      data: (_) => _StatValue.ready('${summary!.openToday}'),
    );
    final eventCard = events.when(
      loading: () => const _StatValue.loading(),
      error: (_, _) => const _StatValue.unavailable(),
      data: (rows) => _StatValue.ready('${rows.length}'),
    );
    final focusCard = focus.when(
      loading: () => const _StatValue.loading(),
      error: (_, _) => const _StatValue.unavailable(),
      data: (secs) => _StatValue.ready(_formatFocus(secs)),
    );

    final nothingPlanned =
        _isToday &&
        events.maybeWhen(data: (rows) => rows.isEmpty, orElse: () => false) &&
        summary != null &&
        summary.openToday == 0;

    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        bottom: true,
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(tasksListProvider);
            ref.invalidate(todayFocusSecondsProvider);
            ref.invalidate(calendarDayEventsFamily(_selected));
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_greeting()}, $firstName 👋',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 22,
                            color: colors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          DateFormat('EEEE, d MMMM').format(DateTime.now()),
                          style: TextStyle(
                            fontSize: 13,
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    onPressed: () => context.push('/notifications'),
                    icon: const Icon(Icons.notifications_outlined),
                    color: colors.textSecondary,
                  ),
                  Semantics(
                    button: true,
                    label: 'Open profile',
                    child: GestureDetector(
                      onTap: () => context.push('/profile'),
                      child: ProfileAvatar(
                        initials: initials,
                        imageUrl: avatarUrl,
                        radius: 16,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _WeekStrip(
                selected: _selected,
                onSelect: (d) => setState(() => _selected = d),
              ),
              if (DayPilotEnv.hasDaypilotApi && sync.showDashboardBanner)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: _Panel(
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
                        const SizedBox(height: 2),
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
                ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Tasks left today',
                      icon: Icons.check_circle_outline_rounded,
                      tint: colors.accent,
                      value: taskCard,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatCard(
                      label: _isToday
                          ? 'Events today'
                          : 'Events, ${DateFormat('d MMM').format(_selected)}',
                      icon: Icons.calendar_today_rounded,
                      tint: DayPilotColors.meetings,
                      value: eventCard,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Focus time today',
                      icon: Icons.bar_chart_rounded,
                      tint: DayPilotColors.projects,
                      value: focusCard,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _RingCard(
                      label: 'Tasks done today',
                      summary: summary,
                      failed: tasks.hasError,
                      loading: tasks.isLoading,
                    ),
                  ),
                ],
              ),
              if (nothingPlanned) ...[
                const SizedBox(height: 14),
                _PlanPrompt(userId: user?.id),
              ],
              const SizedBox(height: 18),
              _SectionTitle(
                title: _isToday
                    ? "Today's plan"
                    : 'Plan for ${DateFormat('EEE d MMM').format(_selected)}',
                actionLabel: 'New event',
                onAction: () => context.push('/events/new'),
              ),
              const SizedBox(height: 8),
              events.when(
                loading: () => const _Panel(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                error: (_, _) => _Panel(
                  child: Text(
                    'Unavailable. The schedule could not be loaded.',
                    style: TextStyle(color: colors.textSecondary),
                  ),
                ),
                data: (rows) => rows.isEmpty
                    ? _Panel(
                        child: Text(
                          _isToday
                              ? 'No events today.'
                              : 'No events on this day.',
                          style: TextStyle(color: colors.textSecondary),
                        ),
                      )
                    : Column(
                        children: [for (final e in rows) _EventRow(event: e)],
                      ),
              ),
              const SizedBox(height: 18),
              _SectionTitle(
                title: 'Tasks',
                actionLabel: 'See all',
                onAction: () => context.go('/tasks'),
              ),
              const SizedBox(height: 8),
              tasks.when(
                loading: () => const _Panel(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                error: (_, _) => _Panel(
                  child: Text(
                    'Unavailable. Tasks could not be loaded.',
                    style: TextStyle(color: colors.textSecondary),
                  ),
                ),
                data: (_) => summary!.todayTasks.isEmpty
                    ? _Panel(
                        child: Text(
                          'No tasks for today.',
                          style: TextStyle(color: colors.textSecondary),
                        ),
                      )
                    : Column(
                        children: [
                          for (final t in summary.todayTasks.take(6))
                            _TaskRowTile(
                              task: t,
                              onToggle: () => _toggleTask(t),
                            ),
                        ],
                      ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _QuickLink(
                      icon: Icons.link_rounded,
                      label: 'Booking links',
                      onTap: () => context.push('/booking-links'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickLink(
                      icon: Icons.auto_awesome_rounded,
                      label: 'Pilot Brief',
                      onTap: () => context.push('/insights/brief'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const FounderHubHomeButton(),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatFocus(int seconds) {
  if (seconds <= 0) return 'None yet';
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  if (h == 0) return '${m}m';
  return '${h}h ${m}m';
}

class _StatValue {
  const _StatValue._(this.text, this.unavailable);
  const _StatValue.loading() : this._('…', false);
  const _StatValue.unavailable() : this._('Unavailable', true);
  const _StatValue.ready(String text) : this._(text, false);

  final String text;
  final bool unavailable;
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.borderSubtle),
      ),
      child: child,
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.icon,
    required this.tint,
    required this.value,
  });

  final String label;
  final IconData icon;
  final Color tint;
  final _StatValue value;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Semantics(
      label: '$label: ${value.text}',
      excludeSemantics: true,
      child: _Panel(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value.text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: value.unavailable ? 15 : 22,
                      fontWeight: FontWeight.w800,
                      color: value.unavailable
                          ? colors.textTertiary
                          : colors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: colors.textSecondary),
                  ),
                ],
              ),
            ),
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: tint),
            ),
          ],
        ),
      ),
    );
  }
}

/// Done against due today. With nothing due the ring is empty and the text
/// says so. There is no goal setting, so no percentage is shown.
class _RingCard extends StatelessWidget {
  const _RingCard({
    required this.label,
    required this.summary,
    required this.failed,
    required this.loading,
  });

  final String label;
  final TodayTaskSummary? summary;
  final bool failed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final s = summary;
    final text = loading
        ? '…'
        : failed || s == null
        ? 'Unavailable'
        : s.dueTotal == 0
        ? 'None due'
        : '${s.doneToday} of ${s.dueTotal}';
    final muted = failed || s == null;
    return Semantics(
      label: '$label: $text',
      excludeSemantics: true,
      child: _Panel(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: muted ? 15 : 20,
                      fontWeight: FontWeight.w800,
                      color: muted ? colors.textTertiary : colors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: colors.textSecondary),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 34,
              height: 34,
              child: CircularProgressIndicator(
                value: s?.fraction ?? 0,
                strokeWidth: 4,
                backgroundColor: colors.borderSubtle,
                color: colors.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({required this.selected, required this.onSelect});

  final DateTime selected;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    final days = weekDaysContaining(todayOnly);
    return Row(
      children: [
        for (final d in days)
          Expanded(
            child: Semantics(
              button: true,
              selected: d == selected,
              label: DateFormat('EEEE d MMMM').format(d),
              excludeSemantics: true,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onSelect(d),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: d == selected ? colors.accent : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Text(
                        DateFormat('E').format(d).substring(0, 1),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: d == selected
                              ? colors.textInverse
                              : colors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${d.day}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: d == selected
                              ? colors.textInverse
                              : d == todayOnly
                              ? colors.accent
                              : colors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: colors.textPrimary,
            ),
          ),
        ),
        TextButton(onPressed: onAction, child: Text(actionLabel)),
      ],
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});

  final EventRecord event;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final chip = calendarChipStyleFor(
      calendarColor: event.calendarColor,
      externalCalendarId: event.externalCalendarId,
      calendarId: event.calendarId,
      source: event.source,
    );
    final time = event.allDay
        ? 'All day'
        : '${DateFormat.jm().format(event.startsAt)} – ${DateFormat.jm().format(event.endsAt)}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: colors.surfacePrimary,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.push('/events/${event.id}'),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.borderSubtle),
            ),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 36,
                  decoration: BoxDecoration(
                    color: chip.accent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: colors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        time,
                        style: TextStyle(
                          fontSize: 12,
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: colors.textTertiary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TaskRowTile extends StatelessWidget {
  const _TaskRowTile({required this.task, required this.onToggle});

  final TaskRow task;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final done = task.isDone;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        decoration: BoxDecoration(
          color: colors.surfacePrimary,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colors.borderSubtle),
        ),
        child: ListTile(
          dense: true,
          leading: IconButton(
            tooltip: done ? 'Mark as not done' : 'Mark as done',
            onPressed: onToggle,
            icon: Icon(
              done
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: done ? colors.accent : colors.borderStrong,
            ),
          ),
          title: Text(
            task.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: done ? colors.textTertiary : colors.textPrimary,
              decoration: done ? TextDecoration.lineThrough : null,
            ),
          ),
          subtitle: Text(
            task.priority,
            style: TextStyle(fontSize: 12, color: colors.textSecondary),
          ),
          trailing: PriorityDot(priority: task.priority),
          onTap: () => context.push('/tasks/${task.id}'),
        ),
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Material(
      color: colors.surfacePrimary,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colors.borderSubtle),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: colors.accent),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: colors.textPrimary,
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

class _PlanPrompt extends ConsumerStatefulWidget {
  const _PlanPrompt({required this.userId});

  final String? userId;

  @override
  ConsumerState<_PlanPrompt> createState() => _PlanPromptState();
}

class _PlanPromptState extends ConsumerState<_PlanPrompt> {
  static String _key(String userId) => 'today_plan_prompt_dismissed_$userId';

  late bool _hidden;

  @override
  void initState() {
    super.initState();
    final id = widget.userId;
    _hidden =
        id == null ||
        ref.read(sharedPreferencesProvider).getBool(_key(id)) == true;
  }

  @override
  Widget build(BuildContext context) {
    if (_hidden) return const SizedBox.shrink();
    return EmptyScheduleHint(
      compact: true,
      title: 'Nothing planned for today.',
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
            .setBool(_key(widget.userId!), true);
        if (mounted) setState(() => _hidden = true);
      },
    );
  }
}
