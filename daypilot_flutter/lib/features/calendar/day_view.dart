import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'calendar_error_view.dart';
import 'calendar_providers.dart';

class DayCalendarView extends ConsumerWidget {
  const DayCalendarView({super.key, required this.focusDay});

  final DateTime focusDay;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final d = DateTime(focusDay.year, focusDay.month, focusDay.day);
    final async = ref.watch(calendarDayEventsFamily(d));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => CalendarErrorView(
        error: e,
        onRetry: () => ref.invalidate(calendarDayEventsFamily(d)),
      ),
      data: (events) {
        if (events.isEmpty) {
          return const Center(child: Text('No events on this day.'));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: events.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, i) {
            final e = events[i];
            return ListTile(
              title: Text(e.title),
              subtitle: Text(TimeOfDay.fromDateTime(e.startsAt).format(context)),
              onTap: () => context.push('/events/${e.id}'),
            );
          },
        );
      },
    );
  }
}
