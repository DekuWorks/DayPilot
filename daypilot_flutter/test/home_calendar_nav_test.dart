import 'package:daypilot_flutter/features/calendar/calendar_view_mode.dart';
import 'package:daypilot_flutter/features/shell/app_shell.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('bottom nav is Today, Calendar, Tasks, Insights', () {
    expect(kAppShellDestinations.map((d) => d.label).toList(), [
      'Today',
      'Calendar',
      'Tasks',
      'Insights',
    ]);
    // Profile opens from the avatar on Today, not from a tab.
    expect(kAppShellDestinations.any((d) => d.label == 'Profile'), isFalse);
  });

  test('calendar views are Month, Week, Day', () {
    expect(kCalendarViewLabels, ['Month', 'Week', 'Day']);
    expect(parseCalendarViewMode(null), CalendarViewMode.day);
    expect(parseCalendarViewMode('week'), CalendarViewMode.week);
    expect(parseCalendarViewMode('day'), CalendarViewMode.day);
    expect(CalendarViewMode.month.index, 0);
  });
}
