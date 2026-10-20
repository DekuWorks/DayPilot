import '../tasks/task_models.dart';

/// Counts for the Today screen. Pure so it can be tested without Supabase.
///
/// "Due today" follows the Tasks tab: an open task with no due date, or a due
/// date inside today. Done today uses `completed_at`. Nothing here invents a
/// goal or a percentage; with no tasks due the ring stays empty.
class TodayTaskSummary {
  const TodayTaskSummary({
    required this.openToday,
    required this.doneToday,
    required this.todayTasks,
  });

  final int openToday;
  final int doneToday;

  /// Open tasks for today, then tasks finished today.
  final List<TaskRow> todayTasks;

  int get dueTotal => openToday + doneToday;

  /// 0 to 1. Zero when nothing is due.
  double get fraction => dueTotal == 0 ? 0 : doneToday / dueTotal;
}

TodayTaskSummary summariseTodayTasks(List<TaskRow> all, DateTime now) {
  final dayStart = DateTime(now.year, now.month, now.day);
  final dayEnd = dayStart.add(const Duration(days: 1));

  final open = all.where((t) {
    if (t.isDone || t.status == 'cancelled') return false;
    final due = t.dueAt;
    if (due == null) return true;
    return !due.isBefore(dayStart) && due.isBefore(dayEnd);
  }).toList();

  final done = all.where((t) {
    final at = t.completedAt;
    return t.isDone && at != null && !at.isBefore(dayStart);
  }).toList();

  return TodayTaskSummary(
    openToday: open.length,
    doneToday: done.length,
    todayTasks: [...open, ...done],
  );
}

/// Monday to Sunday, matching the calendar week.
List<DateTime> weekDaysContaining(DateTime day) {
  final start = DateTime(
    day.year,
    day.month,
    day.day,
  ).subtract(Duration(days: day.weekday - DateTime.monday));
  return [for (var i = 0; i < 7; i++) start.add(Duration(days: i))];
}
