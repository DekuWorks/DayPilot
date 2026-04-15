/// Maps to Supabase `attendees` (`rsvp_status`: going, maybe, declined, pending).
class Attendee {
  const Attendee({
    required this.id,
    required this.eventId,
    required this.email,
    this.name,
    this.userId,
    this.rsvpStatus = 'pending',
  });

  final String id;
  final String eventId;
  final String? userId;
  final String email;
  final String? name;
  final String rsvpStatus;
}
