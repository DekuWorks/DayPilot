import 'package:daypilot_flutter/features/calendar/calendar_view_mode.dart';
import 'package:daypilot_flutter/features/shell/app_shell.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('bottom nav is Home, Tasks, Insights, Profile', () {
    expect(
      kAppShellDestinations.map((d) => d.label).toList(),
      ['Home', 'Tasks', 'Insights', 'Profile'],
    );
    expect(
      kAppShellDestinations.any((d) => d.label == 'Calendar'),
      isFalse,
    );
  });

  test('home calendar views are Month, Week, Day', () {
    expect(kCalendarViewLabels, ['Month', 'Week', 'Day']);
    expect(parseCalendarViewMode(null), CalendarViewMode.month);
    expect(parseCalendarViewMode('week'), CalendarViewMode.week);
    expect(parseCalendarViewMode('day'), CalendarViewMode.day);
    expect(CalendarViewMode.month.index, 0);
  });
}
