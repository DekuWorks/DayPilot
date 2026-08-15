import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/services/realtime_service.dart';
import 'calendar_view_mode.dart';
import 'day_view.dart';
import 'month_view.dart';
import 'week_view.dart';

/// Month / week / day calendar views (Home hero).
class CalendarPanel extends ConsumerStatefulWidget {
  const CalendarPanel({
    super.key,
    this.initialView = CalendarViewMode.month,
  });

  final CalendarViewMode initialView;

  @override
  ConsumerState<CalendarPanel> createState() => _CalendarPanelState();
}

class _CalendarPanelState extends ConsumerState<CalendarPanel>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(
    length: 3,
    vsync: this,
    initialIndex: widget.initialView.index,
  );
  RealtimeChannel? _realtime;

  late DateTime _visibleMonth;
  late DateTime _focusDay;

  @override
  void initState() {
    super.initState();
    final n = DateTime.now();
    _visibleMonth = DateTime(n.year, n.month, 1);
    _focusDay = DateTime(n.year, n.month, n.day);
    _tabs.addListener(_onTabChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (DayPilotEnv.hasDaypilotApi) return;
      final client = ref.read(supabaseClientProvider);
      _realtime = RealtimeService(client).subscribeToEvents((_) {
        ref.read(calendarDataVersionProvider.notifier).bump();
      });
    });
  }

  void _onTabChanged() {
    if (!_tabs.indexIsChanging) setState(() {});
  }

  @override
  void dispose() {
    _tabs.removeListener(_onTabChanged);
    _tabs.dispose();
    _realtime?.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Column(
      children: [
        Material(
          color: colors.backgroundPrimary,
          child: TabBar(
            controller: _tabs,
            overlayColor: const WidgetStatePropertyAll(Colors.transparent),
            labelPadding: EdgeInsets.zero,
            labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
            unselectedLabelStyle:
                Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
            tabs: [
              for (final label in kCalendarViewLabels)
                Tab(text: label, height: 32),
            ],
          ),
        ),
        if (_tabs.index == CalendarViewMode.month.index)
          _MonthNav(
            month: _visibleMonth,
            onChanged: (m) => setState(() => _visibleMonth = m),
            onToday: () {
              final n = DateTime.now();
              setState(() {
                _visibleMonth = DateTime(n.year, n.month, 1);
                _focusDay = DateTime(n.year, n.month, n.day);
              });
            },
          )
        else if (_tabs.index == CalendarViewMode.week.index)
          _DayStepper(
            label: 'Week of',
            day: _focusDay,
            onPrev: () => setState(
              () => _focusDay = _focusDay.subtract(const Duration(days: 7)),
            ),
            onNext: () => setState(
              () => _focusDay = _focusDay.add(const Duration(days: 7)),
            ),
          )
        else
          _DayStepper(
            label: 'Day',
            day: _focusDay,
            onPrev: () => setState(
              () => _focusDay = _focusDay.subtract(const Duration(days: 1)),
            ),
            onNext: () => setState(
              () => _focusDay = _focusDay.add(const Duration(days: 1)),
            ),
          ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: [
              MonthCalendarView(
                visibleMonth: _visibleMonth,
                onDayTap: (d) {
                  setState(() {
                    _focusDay = DateTime(d.year, d.month, d.day);
                    _visibleMonth = DateTime(d.year, d.month, 1);
                  });
                  _tabs.animateTo(CalendarViewMode.day.index);
                },
              ),
              WeekCalendarView(focusDay: _focusDay),
              DayCalendarView(focusDay: _focusDay),
            ],
          ),
        ),
      ],
    );
  }
}

class _MonthNav extends StatelessWidget {
  const _MonthNav({
    required this.month,
    required this.onChanged,
    this.onToday,
  });

  final DateTime month;
  final ValueChanged<DateTime> onChanged;
  final VoidCallback? onToday;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Material(
      color: colors.surfaceSecondary,
      child: SizedBox(
        height: 36,
        child: Row(
          children: [
            IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: 20,
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                onChanged(DateTime(month.year, month.month - 1, 1));
              },
            ),
            Expanded(
              child: Text(
                MaterialLocalizations.of(context).formatMonthYear(month),
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                textAlign: TextAlign.center,
              ),
            ),
            TextButton(
              onPressed: onToday,
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(44, 32),
              ),
              child: const Text('Today'),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: 20,
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                onChanged(DateTime(month.year, month.month + 1, 1));
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DayStepper extends StatelessWidget {
  const _DayStepper({
    required this.label,
    required this.day,
    required this.onPrev,
    required this.onNext,
  });

  final String label;
  final DateTime day;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final loc = MaterialLocalizations.of(context);
    final colors = context.dp;
    return Material(
      color: colors.surfaceSecondary,
      child: SizedBox(
        height: 36,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: 20,
              icon: const Icon(Icons.chevron_left),
              onPressed: onPrev,
            ),
            Text(
              '$label ${loc.formatMediumDate(day)}',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: colors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: 20,
              icon: const Icon(Icons.chevron_right),
              onPressed: onNext,
            ),
          ],
        ),
      ),
    );
  }
}
