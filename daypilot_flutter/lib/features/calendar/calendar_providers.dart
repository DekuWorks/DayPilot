import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../domain/models/event_record.dart';
import '../../domain/models/workspace_record.dart';

List<EventRecord> applyWorkspaceColors(
  List<EventRecord> events,
  List<WorkspaceRecord> workspaces,
) {
  final byId = {for (final w in workspaces) w.id: w.color};
  return [
    for (final event in events)
      event.workspaceId != null && byId.containsKey(event.workspaceId)
          ? event.copyWith(calendarColor: byId[event.workspaceId!])
          : event,
  ];
}

Future<List<EventRecord>> _withWorkspaceColors(
  Ref ref,
  Future<List<EventRecord>> events,
) async {
  final rows = await events;
  try {
    final workspaces = await ref.watch(workspacesProvider.future);
    return applyWorkspaceColors(rows, workspaces);
  } catch (_) {
    return rows;
  }
}

Future<List<EventRecord>> loadEventsForRange(
  Ref ref, {
  required DateTime from,
  required DateTime to,
}) {
  if (DayPilotEnv.hasDaypilotApi) {
    final sync = ref.watch(apiSessionSyncProvider);
    if (sync.status != ApiSessionSyncStatus.ready &&
        sync.status != ApiSessionSyncStatus.failed) {
      final pending = Completer<List<EventRecord>>();
      ref.onDispose(() {
        if (!pending.isCompleted) pending.complete(const []);
      });
      return pending.future;
    }
  }
  return ref.watch(eventRepositoryProvider).listForRange(from: from, to: to);
}

/// Month grid: [key] is the first day of that month (year, month, 1).
final calendarMonthEventsFamily =
    FutureProvider.autoDispose.family<List<EventRecord>, DateTime>(
  (ref, month) async {
    ref.watch(calendarDataVersionProvider);
    final from = DateTime(month.year, month.month, 1);
    final to = DateTime(month.year, month.month + 1, 1)
        .subtract(const Duration(seconds: 1));
    return _withWorkspaceColors(
      ref,
      loadEventsForRange(ref, from: from, to: to),
    );
  },
);

/// Week containing [focusDay] (Monday–Sunday range).
final calendarWeekEventsFamily =
    FutureProvider.autoDispose.family<List<EventRecord>, DateTime>(
  (ref, focusDay) async {
    ref.watch(calendarDataVersionProvider);
    final dayStart = DateTime(focusDay.year, focusDay.month, focusDay.day);
    final from = dayStart.subtract(
      Duration(days: focusDay.weekday - DateTime.monday),
    );
    final to = from.add(const Duration(days: 7));
    return _withWorkspaceColors(
      ref,
      loadEventsForRange(ref, from: from, to: to),
    );
  },
);

/// Single calendar day.
final calendarDayEventsFamily =
    FutureProvider.autoDispose.family<List<EventRecord>, DateTime>(
  (ref, focusDay) async {
    ref.watch(calendarDataVersionProvider);
    final from = DateTime(focusDay.year, focusDay.month, focusDay.day);
    final to = from
        .add(const Duration(days: 1))
        .subtract(const Duration(milliseconds: 1));
    return _withWorkspaceColors(
      ref,
      loadEventsForRange(ref, from: from, to: to),
    );
  },
);
