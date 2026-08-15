import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/api_session_sync_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/event_record.dart';
import 'calendar_chip_color.dart';
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

    final weekCount = totalCells ~/ 7;
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 2, 6, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 16,
            child: Row(
              children: List.generate(7, (i) {
                final label = loc.narrowWeekdays[i];
                return Expanded(
                  child: Center(
                    child: Text(
                      label,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: DayPilotScheme.of(context).textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 10,
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 2),
          Expanded(
            child: Column(
              children: [
                for (int row = 0; row < weekCount; row++)
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
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
                  ),
              ],
            ),
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
      return const SizedBox.expand();
    }
    final day = i + 1;
    final date = DateTime(year, month, day);
    final isToday = _sameCalendarDay(date, today);
    final dayEvents = eventsForDay(date);
    final colors = DayPilotScheme.of(context);

    return Padding(
      padding: const EdgeInsets.all(1.5),
      child: Material(
        color: isToday
            ? todayCellWash(context)
            : colors.surfaceSecondary.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(8),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onDayTap == null ? null : () => onDayTap!(date),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(3, 2, 3, 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '$day',
                  textAlign: TextAlign.right,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                    color: isToday ? colors.accent : colors.textPrimary,
                    fontSize: 11,
                  ),
                ),
                Expanded(
                  child: dayEvents.isEmpty
                      ? const SizedBox.shrink()
                      : ListView(
                          padding: EdgeInsets.zero,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            for (final e in dayEvents.take(2))
                              Padding(
                                padding: const EdgeInsets.only(bottom: 1),
                                child: Builder(
                                  builder: (context) {
                                    final chip = calendarChipStyleForEvent(
                                      e,
                                      lightSurface:
                                          Theme.of(context).brightness ==
                                              Brightness.light,
                                    );
                                    return Material(
                                      color: chip.fill,
                                      borderRadius: BorderRadius.circular(3),
                                      child: InkWell(
                                        onTap: () => onEventTap(e.id),
                                        borderRadius: BorderRadius.circular(3),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 3,
                                            vertical: 1,
                                          ),
                                          child: Text(
                                            e.title,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.labelSmall
                                                ?.copyWith(
                                              color: chip.foreground,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            if (dayEvents.length > 2)
                              Text(
                                '+${dayEvents.length - 2}',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: colors.textSecondary,
                                  fontSize: 9,
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
    );
  }
}
