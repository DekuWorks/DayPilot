import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/calendar/merge_booking_events.dart';
import '../../domain/models/event_record.dart';
import 'event_repository.dart';

/// Shows the host's confirmed booking-link appointments on the same calendar
/// as Nest or Supabase events. Does not change how those events are stored.
class BookingOverlayEventRepository implements EventRepository {
  BookingOverlayEventRepository({
    required EventRepository inner,
    required SupabaseClient client,
  })  : _inner = inner,
        _client = client;

  final EventRepository _inner;
  final SupabaseClient _client;

  @override
  Future<List<EventRecord>> listForRange({
    required DateTime from,
    required DateTime to,
  }) async {
    final events = await _inner.listForRange(from: from, to: to);
    try {
      final bookings = await _confirmedBookings(from: from, to: to);
      return mergeBookingEvents(events, bookings);
    } catch (_) {
      return events;
    }
  }

  @override
  Future<EventRecord?> getById(String id) async {
    if (!isBookingEventId(id)) return _inner.getById(id);
    final bookingId = id.substring('booking:'.length);
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final row = await _client
        .from('bookings')
        .select(
          'id, booker_name, booker_email, start_time, end_time, booking_link_id',
        )
        .eq('id', bookingId)
        .eq('status', 'confirmed')
        .maybeSingle();
    if (row == null) return null;
    final map = Map<String, dynamic>.from(row);
    final linkId = map['booking_link_id']?.toString();
    if (linkId == null) return null;
    final link = await _client
        .from('booking_links')
        .select('title, owner_user_id')
        .eq('id', linkId)
        .maybeSingle();
    if (link == null) return null;
    final linkMap = Map<String, dynamic>.from(link);
    if (linkMap['owner_user_id']?.toString() != uid) return null;
    final booking = CalendarBooking(
      id: bookingId,
      title: (linkMap['title'] as String?) ?? 'Booking',
      bookerName: (map['booker_name'] as String?) ?? 'Guest',
      bookerEmail: (map['booker_email'] as String?) ?? '',
      startsAt: DateTime.parse(map['start_time'].toString()),
      endsAt: DateTime.parse(map['end_time'].toString()),
    );
    return mergeBookingEvents(const [], [booking]).first;
  }

  @override
  Future<EventRecord> create(EventRecord draft) => _inner.create(draft);

  @override
  Future<EventRecord> update(EventRecord event) => _inner.update(event);

  @override
  Future<void> delete(String id) {
    if (isBookingEventId(id)) {
      throw StateError(
        'Pause the booking link or cancel the booking. This calendar row is not a separate event.',
      );
    }
    return _inner.delete(id);
  }

  Future<List<CalendarBooking>> _confirmedBookings({
    required DateTime from,
    required DateTime to,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final links = await _client
        .from('booking_links')
        .select('id, title')
        .eq('owner_user_id', uid);
    final linkRows = (links as List)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    if (linkRows.isEmpty) return const [];
    final titles = {
      for (final row in linkRows) row['id'].toString(): '${row['title'] ?? ''}',
    };
    final bookings = await _client
        .from('bookings')
        .select(
          'id, booker_name, booker_email, start_time, end_time, booking_link_id',
        )
        .inFilter('booking_link_id', titles.keys.toList())
        .eq('status', 'confirmed')
        .gt('end_time', from.toUtc().toIso8601String())
        .lt('start_time', to.toUtc().toIso8601String());
    return (bookings as List).map((row) {
      final map = Map<String, dynamic>.from(row as Map);
      return CalendarBooking(
        id: map['id'].toString(),
        title: titles[map['booking_link_id'].toString()] ?? 'Booking',
        bookerName: (map['booker_name'] as String?) ?? 'Guest',
        bookerEmail: (map['booker_email'] as String?) ?? '',
        startsAt: DateTime.parse(map['start_time'].toString()),
        endsAt: DateTime.parse(map['end_time'].toString()),
      );
    }).toList();
  }
}
