enum RsvpStatus { pending, yes, no, maybe }

class Rsvp {
  const Rsvp({
    required this.id,
    required this.eventId,
    required this.attendeeId,
    required this.status,
    this.respondedAt,
  });

  final String id;
  final String eventId;
  final String attendeeId;
  final RsvpStatus status;
  final DateTime? respondedAt;
}
