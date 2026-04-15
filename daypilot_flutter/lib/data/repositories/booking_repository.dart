import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/booking_page.dart';
import '../../domain/models/booking_slot.dart';

class BookingRepository {
  BookingRepository(this._client);

  final SupabaseClient _client;

  Future<BookingPage?> getPageBySlug(String slug) async {
    final row = await _client
        .from('booking_links')
        .select(
          'id, slug, title, description, is_active, owner_user_id',
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
    if (row == null) return null;
    final m = Map<String, dynamic>.from(row);
    return BookingPage(
      id: m['id'].toString(),
      slug: m['slug'] as String? ?? slug,
      title: (m['title'] as String?)?.trim().isNotEmpty == true
          ? m['title'] as String
          : 'Booking',
      description: m['description'] as String?,
      ownerId: m['owner_user_id']?.toString(),
      isPublished: m['is_active'] as bool? ?? false,
    );
  }

  Future<List<BookingSlot>> listSlotsForPage(String bookingPageId) async {
    final link = await _client
        .from('booking_links')
        .select('id, duration')
        .eq('id', bookingPageId)
        .single();
    final durationMin = (link['duration'] as num?)?.toInt() ?? 30;

    final rulesRaw = await _client
        .from('availability_rules')
        .select('day_of_week, start_time, end_time, is_available')
        .eq('booking_link_id', bookingPageId);
    final rules = (rulesRaw as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((r) => r['is_available'] != false)
        .toList();

    if (rules.isEmpty) return [];

    final excludedRaw = await _client
        .from('booking_excluded_dates')
        .select('excluded_date')
        .eq('booking_link_id', bookingPageId);
    final excluded = (excludedRaw as List<dynamic>)
        .map((e) => DateTime.parse((e as Map)['excluded_date'].toString()))
        .map((d) => DateTime(d.year, d.month, d.day))
        .toSet();

    final bookingsRaw = await _client
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('booking_link_id', bookingPageId)
        .neq('status', 'cancelled');
    final busy = <({DateTime start, DateTime end})>[];
    for (final b in bookingsRaw as List<dynamic>) {
      final m = Map<String, dynamic>.from(b as Map);
      final st = m['start_time'];
      final en = m['end_time'];
      if (st != null && en != null) {
        busy.add((
          start: DateTime.parse(st.toString()),
          end: DateTime.parse(en.toString()),
        ));
      }
    }

    final slots = <BookingSlot>[];
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    for (var d = 0; d < 21; d++) {
      final day = today.add(Duration(days: d));
      if (excluded.contains(DateTime(day.year, day.month, day.day))) {
        continue;
      }
      final dow = day.weekday % 7;
      for (final rule in rules) {
        if ((rule['day_of_week'] as num).toInt() != dow) continue;
        final startT = _parseTime(rule['start_time']);
        final endT = _parseTime(rule['end_time']);
        var cursor = DateTime(
          day.year,
          day.month,
          day.day,
          startT.hour,
          startT.minute,
        );
        final dayEnd = DateTime(
          day.year,
          day.month,
          day.day,
          endT.hour,
          endT.minute,
        );
        while (cursor.isBefore(dayEnd)) {
          final slotEnd = cursor.add(Duration(minutes: durationMin));
          if (slotEnd.isAfter(dayEnd)) break;
          if (slotEnd.isBefore(now)) {
            cursor = slotEnd;
            continue;
          }
          var overlaps = false;
          for (final b in busy) {
            if (cursor.isBefore(b.end) && slotEnd.isAfter(b.start)) {
              overlaps = true;
              break;
            }
          }
          final id = '$bookingPageId|${cursor.toUtc().toIso8601String()}';
          slots.add(
            BookingSlot(
              id: id,
              bookingPageId: bookingPageId,
              startsAt: cursor,
              endsAt: slotEnd,
              capacity: 1,
              bookedCount: overlaps ? 1 : 0,
            ),
          );
          cursor = slotEnd;
        }
      }
    }

    return slots;
  }

  ({int hour, int minute}) _parseTime(dynamic v) {
    final s = v.toString();
    final parts = s.split(':');
    final h = int.parse(parts[0]);
    final m = parts.length > 1 ? int.parse(parts[1].split('.').first) : 0;
    return (hour: h, minute: m);
  }

  Future<void> confirmBooking({
    required String bookingPageId,
    required BookingSlot slot,
    required String guestEmail,
    String? guestName,
  }) async {
    final link = await _client
        .from('booking_links')
        .select('timezone')
        .eq('id', bookingPageId)
        .single();
    final tz = link['timezone'] as String? ?? 'UTC';
    await _client.from('bookings').insert({
      'booking_link_id': bookingPageId,
      'booker_name': (guestName?.trim().isNotEmpty ?? false)
          ? guestName!.trim()
          : 'Guest',
      'booker_email': guestEmail.trim(),
      'start_time': slot.startsAt.toUtc().toIso8601String(),
      'end_time': slot.endsAt.toUtc().toIso8601String(),
      'timezone': tz,
      'status': 'confirmed',
    });
  }
}
