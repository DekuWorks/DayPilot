import 'package:daypilot_flutter/domain/booking/booking_ics.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses UTC instants and escapes commas in the summary', () {
    final ics = buildBookingIcs(
      BookingIcsInput(
        uid: 'booking-1@daypilot.co',
        title: 'Hello, there',
        description: 'Line one',
        start: DateTime.utc(2026, 1, 5, 14),
        end: DateTime.utc(2026, 1, 5, 14, 30),
        attendeeName: 'Ada',
        attendeeEmail: 'ada@example.com',
      ),
    );

    expect(ics, contains('DTSTART:20260105T140000Z'));
    expect(ics, contains('DTEND:20260105T143000Z'));
    expect(ics, contains(r'SUMMARY:Hello\, there'));
    expect(ics, contains('METHOD:PUBLISH'));
    expect(ics.endsWith('\r\n'), isTrue);
  });
}
