import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';

import '../../domain/models/event_record.dart';
import '../../features/tasks/task_models.dart';

/// Publishes today's events/tasks into the iOS App Group for WidgetKit.
class WidgetSnapshotWriter {
  static const channel = MethodChannel('daypilot/widget_snapshot');

  static const _palette = ['#3B82F6', '#39FF14', '#A855F7', '#F5A524'];

  static Future<void> publish({
    required String displayName,
    required List<EventRecord> events,
    required List<TaskRow> tasks,
  }) async {
    if (!Platform.isIOS) return;

    final now = DateTime.now();
    final dayStart = DateTime(now.year, now.month, now.day);
    final dayEnd = dayStart.add(const Duration(days: 1));

    final todayEvents = events.where((e) {
      return e.startsAt.isBefore(dayEnd) && e.endsAt.isAfter(dayStart);
    }).toList()
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));

    final todayTasks = tasks.where((t) {
      if (t.status == 'cancelled') return false;
      if (t.dueAt == null) return true;
      return !t.dueAt!.isBefore(dayStart) && t.dueAt!.isBefore(dayEnd);
    }).toList();

    final payload = <String, Object?>{
      'displayName': displayName,
      'updatedAt': now.toUtc().toIso8601String(),
      'focusMinutes': focusMinutes(todayEvents, dayStart),
      'events': [
        for (var i = 0; i < todayEvents.length; i++)
          {
            'id': todayEvents[i].id,
            'title': todayEvents[i].title,
            'startsAt': todayEvents[i].startsAt.toUtc().toIso8601String(),
            'endsAt': todayEvents[i].endsAt.toUtc().toIso8601String(),
            'location': todayEvents[i].location,
            'color': todayEvents[i].calendarColor ?? _palette[i % _palette.length],
          },
      ],
      'tasks': [
        for (var i = 0; i < todayTasks.length; i++)
          {
            'id': todayTasks[i].id,
            'title': todayTasks[i].title,
            'done': todayTasks[i].isDone,
            'color': _palette[i % _palette.length],
          },
      ],
      'tasksDone': todayTasks.where((t) => t.isDone).length,
      'tasksTotal': todayTasks.length,
    };

    try {
      await channel.invokeMethod('writeSnapshot', jsonEncode(payload));
    } on MissingPluginException {
      // Simulator/host without the method channel — widgets keep placeholder.
    } catch (_) {}
  }

  static int focusMinutes(List<EventRecord> events, DateTime dayStart) {
    const workStart = 9 * 60;
    const workEnd = 17 * 60;
    final busy = <(int, int)>[];
    for (final event in events) {
      final start = event.startsAt.difference(dayStart).inMinutes;
      final end = event.endsAt.difference(dayStart).inMinutes;
      final clippedStart = start < workStart ? workStart : start;
      final clippedEnd = end > workEnd ? workEnd : end;
      if (clippedEnd > clippedStart) {
        busy.add((clippedStart, clippedEnd));
      }
    }
    busy.sort((a, b) => a.$1.compareTo(b.$1));
    var used = 0;
    var cursor = workStart;
    for (final slot in busy) {
      final from = slot.$1 < cursor ? cursor : slot.$1;
      if (slot.$2 > from) {
        used += slot.$2 - from;
        cursor = slot.$2;
      }
    }
    final free = (workEnd - workStart) - used;
    return free < 0 ? 0 : free;
  }
}
