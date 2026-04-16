import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/api_session_sync_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/event_record.dart';
import 'calendar_error_view.dart';
import 'calendar_providers.dart';

bool _sameCalendarDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// Month view: classic grid + event chips (replaces plain list).
class MonthCalendarView extends ConsumerWidget {
  const MonthCalendarView({
    super.key,
    required this.visibleMonth,
    this.onDayTap,
  });

  final DateTime visibleMonth;
  final ValueChanged<DateTime>? onDayTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = DateTime(visibleMonth.year, visibleMonth.month, 1);
    final async = ref.watch(calendarMonthEventsFamily(key));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => CalendarErrorView(
        error: e,
        onRetry: () async {
          await ref.read(apiSessionSyncProvider.notifier).sync();
          ref.invalidate(calendarMonthEventsFamily(key));
        },
      ),
      data: (events) {
        return _MonthGrid(
          visibleMonth: visibleMonth,
          events: events,
          onDayTap: onDayTap,
          onEventTap: (id) => context.push('/events/$id'),
        );
      },
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.visibleMonth,
    required this.events,
    this.onDayTap,
    required this.onEventTap,
  });

  final DateTime visibleMonth;
  final List<EventRecord> events;
  final ValueChanged<DateTime>? onDayTap;
  final ValueChanged<String> onEventTap;

  List<EventRecord> _eventsForDay(DateTime day) {
    return events.where((e) => _sameCalendarDay(e.startsAt, day)).toList()
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  }

  @override
  Widget build(BuildContext context) {
    final loc = MaterialLocalizations.of(context);
    final theme = Theme.of(context);
    final y = visibleMonth.year;
    final m = visibleMonth.month;
    final daysInMonth = DateUtils.getDaysInMonth(y, m);
    final offset = DateUtils.firstDayOffset(y, m, loc);
    final totalCells = ((offset + daysInMonth + 6) ~/ 7) * 7;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: List.generate(7, (i) {
              final label = loc.narrowWeekdays[i];
              return Expanded(
                child: Center(
                  child: Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: DayPilotColors.bodyMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          for (int row = 0; row < totalCells ~/ 7; row++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (int col = 0; col < 7; col++)
                  Expanded(
                    child: _DayCell(
                      cellIndex: row * 7 + col,
                      offset: offset,
                      daysInMonth: daysInMonth,
                      year: y,
                      month: m,
                      today: today,
                      eventsForDay: (day) => _eventsForDay(day),
                      onDayTap: onDayTap,
                      onEventTap: onEventTap,
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.cellIndex,
    required this.offset,
    required this.daysInMonth,
    required this.year,
    required this.month,
    required this.today,
    required this.eventsForDay,
    this.onDayTap,
    required this.onEventTap,
  });

  final int cellIndex;
  final int offset;
  final int daysInMonth;
  final int year;
  final int month;
  final DateTime today;
  final List<EventRecord> Function(DateTime day) eventsForDay;
  final ValueChanged<DateTime>? onDayTap;
  final ValueChanged<String> onEventTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final i = cellIndex - offset;
    if (i < 0 || i >= daysInMonth) {
      return const AspectRatio(
        aspectRatio: 1,
        child: SizedBox.shrink(),
      );
    }
    final day = i + 1;
    final date = DateTime(year, month, day);
    final isToday = _sameCalendarDay(date, today);
    final dayEvents = eventsForDay(date);

    return AspectRatio(
      aspectRatio: 1,
      child: Padding(
        padding: const EdgeInsets.all(2),
        child: Material(
          color: isToday
              ? DayPilotColors.teal.withValues(alpha: 0.12)
              : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onDayTap == null ? null : () => onDayTap!(date),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '$day',
                    textAlign: TextAlign.right,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                      color: isToday ? DayPilotColors.teal : DayPilotColors.ink,
                    ),
                  ),
                  Expanded(
                    child: dayEvents.isEmpty
                        ? const SizedBox.shrink()
                        : ListView(
                            padding: EdgeInsets.zero,
                            physics: const ClampingScrollPhysics(),
                            children: [
                              for (final e in dayEvents.take(3))
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 2),
                                  child: Material(
                                    color: DayPilotColors.teal.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(4),
                                    child: InkWell(
                                      onTap: () => onEventTap(e.id),
                                      borderRadius: BorderRadius.circular(4),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 4,
                                          vertical: 2,
                                        ),
                                        child: Text(
                                          e.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.labelSmall?.copyWith(
                                            color: DayPilotColors.ink,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              if (dayEvents.length > 3)
                                Text(
                                  '+${dayEvents.length - 3}',
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: DayPilotColors.bodyMuted,
                                    fontSize: 10,
                                  ),
                                ),
                            ],
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
