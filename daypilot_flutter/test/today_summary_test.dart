import 'package:daypilot_flutter/features/home/today_summary.dart';
import 'package:daypilot_flutter/features/tasks/task_models.dart';
import 'package:flutter_test/flutter_test.dart';

TaskRow _task(
  String id, {
  String status = 'pending',
  DateTime? due,
  DateTime? completedAt,
}) {
  return TaskRow(
    id: id,
    title: 'Task $id',
    status: status,
    priority: 'medium',
    dueAt: due,
    completedAt: completedAt,
  );
}

void main() {
  final now = DateTime(2026, 10, 17, 14, 30);

  test('counts open tasks due today or with no due date', () {
    final s = summariseTodayTasks([
      _task('a', due: DateTime(2026, 10, 17, 23, 59)),
      _task('b'),
      _task('c', due: DateTime(2026, 10, 18, 9)),
      _task('d', due: DateTime(2026, 10, 16, 9)),
    ], now);
    expect(s.openToday, 2);
    expect(s.doneToday, 0);
  });

  test('done today uses completed_at, not the due date', () {
    final s = summariseTodayTasks([
      _task('a', status: 'completed', completedAt: DateTime(2026, 10, 17, 9)),
      _task('b', status: 'completed', completedAt: DateTime(2026, 10, 16, 9)),
      _task('c'),
    ], now);
    expect(s.doneToday, 1);
    expect(s.openToday, 1);
    expect(s.dueTotal, 2);
    expect(s.fraction, 0.5);
  });

  test('cancelled tasks are ignored and nothing due leaves the ring empty', () {
    final s = summariseTodayTasks([_task('a', status: 'cancelled')], now);
    expect(s.dueTotal, 0);
    expect(s.fraction, 0);
    expect(s.todayTasks, isEmpty);
  });

  test('week strip runs Monday to Sunday', () {
    final days = weekDaysContaining(DateTime(2026, 10, 17)); // a Saturday
    expect(days.length, 7);
    expect(days.first.weekday, DateTime.monday);
    expect(days.last.weekday, DateTime.sunday);
    expect(days.contains(DateTime(2026, 10, 17)), isTrue);
  });
}
