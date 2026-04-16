import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bump via [CalendarDataVersion.bump] to refetch all calendar family queries.
final calendarDataVersionProvider =
    NotifierProvider<CalendarDataVersion, int>(CalendarDataVersion.new);

class CalendarDataVersion extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}
