import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/attendee.dart';
import '../../domain/models/rsvp.dart';

class AttendeeRepository {
  AttendeeRepository(this._client);

  final SupabaseClient _client;

  Future<List<Attendee>> listForEvent(String eventId) async {
    final rows = await _client
        .from('attendees')
        .select('id, event_id, email, name, rsvp_status')
        .eq('event_id', eventId)
        .order('created_at');
    return (rows as List<dynamic>).map((e) {
      final m = Map<String, dynamic>.from(e as Map);
      return Attendee(
        id: m['id'].toString(),
        eventId: m['event_id'].toString(),
        email: m['email'] as String? ?? '',
        name: m['name'] as String?,
        rsvpStatus: m['rsvp_status'] as String? ?? 'pending',
      );
    }).toList();
  }

  Future<Rsvp> submitRsvp({
    required String eventId,
    required RsvpStatus status,
  }) async {
    final email = _client.auth.currentUser?.email;
    if (email == null) {
      throw StateError('Sign in to RSVP.');
    }
    final dbStatus = _mapStatus(status);
    final updated = await _client
        .from('attendees')
        .update({'rsvp_status': dbStatus})
        .eq('event_id', eventId)
        .eq('email', email)
        .select('id, event_id, rsvp_status')
        .maybeSingle();
    if (updated == null) {
      throw Exception(
        'No attendee row for your email on this event. Ask the organizer to invite you.',
      );
    }
    final m = Map<String, dynamic>.from(updated);
    return Rsvp(
      id: m['id'].toString(),
      eventId: m['event_id'].toString(),
      attendeeId: m['id'].toString(),
      status: status,
      respondedAt: DateTime.now(),
    );
  }

  static String _mapStatus(RsvpStatus s) {
    switch (s) {
      case RsvpStatus.yes:
        return 'going';
      case RsvpStatus.maybe:
        return 'maybe';
      case RsvpStatus.no:
        return 'declined';
      case RsvpStatus.pending:
        return 'pending';
    }
  }
}
