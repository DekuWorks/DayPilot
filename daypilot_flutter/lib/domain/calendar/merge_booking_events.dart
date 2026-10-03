import '../models/event_record.dart';

class CalendarBooking {
  const CalendarBooking({
    required this.id,
    required this.title,
    required this.bookerName,
    required this.bookerEmail,
    required this.startsAt,
    required this.endsAt,
  });

  final String id;
  final String title;
  final String bookerName;
  final String bookerEmail;
  final DateTime startsAt;
  final DateTime endsAt;
}

String bookingEventId(String bookingId) => 'booking:$bookingId';

bool isBookingEventId(String id) => id.startsWith('booking:');

/// Adds confirmed bookings onto the calendar list the app already shows.
/// A booking at the same start and end as an existing event is skipped.
List<EventRecord> mergeBookingEvents(
  List<EventRecord> events,
  List<CalendarBooking> bookings,
) {
  final occupied = <String>{
    for (final event in events) '${event.startsAt.toUtc().toIso8601String()}|${event.endsAt.toUtc().toIso8601String()}',
  };
  final added = <EventRecord>[];
  for (final booking in bookings) {
    final key =
        '${booking.startsAt.toUtc().toIso8601String()}|${booking.endsAt.toUtc().toIso8601String()}';
    if (occupied.contains(key)) continue;
    occupied.add(key);
    final title = booking.title.trim().isEmpty ? 'Booking' : booking.title.trim();
    final name = booking.bookerName.trim().isEmpty ? 'Guest' : booking.bookerName.trim();
    added.add(
      EventRecord(
        id: bookingEventId(booking.id),
        title: '$title · $name',
        startsAt: booking.startsAt.toLocal(),
        endsAt: booking.endsAt.toLocal(),
        description: booking.bookerEmail.isEmpty
            ? 'Booked by $name'
            : 'Booked by $name (${booking.bookerEmail})',
        source: 'booking',
        syncDirection: 'imported',
      ),
    );
  }
  final merged = [...events, ...added]
    ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  return merged;
}
