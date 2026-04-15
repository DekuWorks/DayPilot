import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/repository_providers.dart';
import '../../data/services/realtime_service.dart';
import 'calendar_providers.dart';
import 'day_view.dart';
import 'month_view.dart';
import 'week_view.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen>
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
      // Option C: events live in Nest/Prisma — Supabase `events` realtime does not apply.
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/events/new'),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'out') {
                await ref.read(authRepositoryProvider).signOut();
                if (context.mounted) context.go('/login');
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'out', child: Text('Sign out')),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Month'),
            Tab(text: 'Week'),
            Tab(text: 'Day'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_tabs.index == 0)
            _MonthNav(
              month: _visibleMonth,
              onChanged: (m) => setState(() => _visibleMonth = m),
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
                MonthCalendarView(visibleMonth: _visibleMonth),
                WeekCalendarView(focusDay: _focusDay),
                DayCalendarView(focusDay: _focusDay),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthNav extends StatelessWidget {
  const _MonthNav({required this.month, required this.onChanged});

  final DateTime month;
  final ValueChanged<DateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              onChanged(DateTime(month.year, month.month - 1, 1));
            },
          ),
          Text(
            MaterialLocalizations.of(context).formatMonthYear(month),
            style: Theme.of(context).textTheme.titleMedium,
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
