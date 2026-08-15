/// Home calendar segmented control. Month is first (default).
enum CalendarViewMode { month, week, day }

const kCalendarViewLabels = ['Month', 'Week', 'Day'];

CalendarViewMode parseCalendarViewMode(String? raw) {
  switch (raw) {
    case 'week':
      return CalendarViewMode.week;
    case 'day':
      return CalendarViewMode.day;
    default:
      return CalendarViewMode.month;
  }
}

String calendarViewModeQuery(CalendarViewMode mode) {
  switch (mode) {
    case CalendarViewMode.month:
      return 'month';
    case CalendarViewMode.week:
      return 'week';
    case CalendarViewMode.day:
      return 'day';
  }
}
