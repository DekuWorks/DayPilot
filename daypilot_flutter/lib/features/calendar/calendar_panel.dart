import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../data/services/realtime_service.dart';
import 'calendar_providers.dart';
import 'day_view.dart';
import 'month_view.dart';
import 'week_view.dart';

/// Month / week / day calendar views (shared by [DashboardScreen]).
class CalendarPanel extends ConsumerStatefulWidget {
  const CalendarPanel({super.key});

  @override
  ConsumerState<CalendarPanel> createState() => _CalendarPanelState();
}

class _CalendarPanelState extends ConsumerState<CalendarPanel>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: 3, vsync: this, initialIndex: 0);
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
        ref.invalidate(calendarMonthEventsFamily);
        ref.invalidate(calendarWeekEventsFamily);
        ref.invalidate(calendarDayEventsFamily);
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
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Material(
          color: scheme.surface.withValues(alpha: 0.92),
          child: TabBar(
            controller: _tabs,
            labelStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
            tabs: const [
              Tab(text: 'Month'),
              Tab(text: 'Week'),
              Tab(text: 'Day'),
            ],
          ),
        ),
        if (_tabs.index == 0)
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
        else if (_tabs.index == 1)
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
                  _tabs.animateTo(2);
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
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              onChanged(DateTime(month.year, month.month - 1, 1));
            },
          ),
          Expanded(
            child: Text(
              MaterialLocalizations.of(context).formatMonthYear(month),
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
          ),
          TextButton(
            onPressed: onToday,
            child: const Text('Today'),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {
              onChanged(DateTime(month.year, month.month + 1, 1));
            },
          ),
        ],
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
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(icon: const Icon(Icons.chevron_left), onPressed: onPrev),
          Text(
            '$label ${loc.formatMediumDate(day)}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          IconButton(icon: const Icon(Icons.chevron_right), onPressed: onNext),
        ],
      ),
    );
  }
}
