/// iCalendar file for a confirmed booking. UTC instants, METHOD:PUBLISH.
class BookingIcsInput {
  const BookingIcsInput({
    required this.uid,
    required this.title,
    required this.description,
    required this.start,
    required this.end,
    required this.attendeeName,
    required this.attendeeEmail,
  });

  final String uid;
  final String title;
  final String description;
  final DateTime start;
  final DateTime end;
  final String attendeeName;
  final String attendeeEmail;
}

String formatIcsUtc(DateTime value) {
  final date = value.toUtc();
  String pad(int n) => n.toString().padLeft(2, '0');
  return '${date.year}${pad(date.month)}${pad(date.day)}'
      'T${pad(date.hour)}${pad(date.minute)}${pad(date.second)}Z';
}

String escapeIcsText(String value) {
  return value
      .replaceAll(r'\', r'\\')
      .replaceAll(RegExp(r'\r\n|\n|\r'), r'\n')
      .replaceAll(',', r'\,')
      .replaceAll(';', r'\;');
}

String _foldLine(String line) {
  if (line.length <= 75) return line;
  final parts = <String>[line.substring(0, 75)];
  var index = 75;
  while (index < line.length) {
    final end = index + 74 > line.length ? line.length : index + 74;
    parts.add(' ${line.substring(index, end)}');
    index += 74;
  }
  return parts.join('\r\n');
}

String buildBookingIcs(BookingIcsInput input) {
  final lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DayPilot//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:${escapeIcsText(input.uid)}',
    'DTSTAMP:${formatIcsUtc(DateTime.now())}',
    'DTSTART:${formatIcsUtc(input.start)}',
    'DTEND:${formatIcsUtc(input.end)}',
    'SUMMARY:${escapeIcsText(input.title)}',
    'DESCRIPTION:${escapeIcsText(input.description)}',
    'ORGANIZER;CN=DayPilot:mailto:hello@daypilot.co',
    'ATTENDEE;CN=${escapeIcsText(input.attendeeName)};RSVP=FALSE:mailto:${input.attendeeEmail.trim()}',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return '${lines.map(_foldLine).join('\r\n')}\r\n';
}
