import 'package:daypilot_flutter/domain/calendar/merge_booking_events.dart';
import 'package:daypilot_flutter/domain/models/event_record.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('confirmed booking is added and a matching time is not duplicated', () {
    final events = [
      EventRecord(
        id: 'event-1',
        title: 'Standup',
        startsAt: DateTime.utc(2026, 10, 2, 15),
        endsAt: DateTime.utc(2026, 10, 2, 15, 30),
      ),
    ];
    final merged = mergeBookingEvents(events, [
      CalendarBooking(
        id: 'book-1',
        title: 'Intro call',
        bookerName: 'Ada',
        bookerEmail: 'ada@example.com',
        startsAt: DateTime.utc(2026, 10, 2, 16),
        endsAt: DateTime.utc(2026, 10, 2, 16, 30),
      ),
      CalendarBooking(
        id: 'book-2',
        title: 'Intro call',
        bookerName: 'Grace',
        bookerEmail: 'grace@example.com',
        startsAt: DateTime.utc(2026, 10, 2, 15),
        endsAt: DateTime.utc(2026, 10, 2, 15, 30),
      ),
    ]);

    expect(merged, hasLength(2));
    expect(merged.last.id, 'booking:book-1');
    expect(merged.last.title, 'Intro call · Ada');
    expect(merged.last.source, 'booking');
    expect(merged.last.canDelete, isFalse);
  });
}
