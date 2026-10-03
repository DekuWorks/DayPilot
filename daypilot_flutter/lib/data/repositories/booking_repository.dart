import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../../domain/models/booking_page.dart';
import '../../domain/models/booking_slot.dart';
import 'booking_confirmation.dart';

class BookingRepository {
  BookingRepository(this._client);

  final SupabaseClient _client;
  static bool _zonesReady = false;

  void _ensureZones() {
    if (_zonesReady) return;
    tzdata.initializeTimeZones();
    _zonesReady = true;
  }

  Future<BookingPage?> getPageBySlug(String slug) async {
    final row = await _client
        .from('booking_links')
        .select('id, slug, title, description, is_active, owner_user_id')
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
    _ensureZones();
    final link = await _client
        .from('booking_links')
        .select('id, duration, timezone')
        .eq('id', bookingPageId)
        .single();
    final durationMin = (link['duration'] as num?)?.toInt() ?? 30;
    final timeZone = (link['timezone'] as String?)?.trim();
    final location = _location(timeZone);

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
        .map((e) => (e as Map)['excluded_date'].toString().substring(0, 10))
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
          start: DateTime.parse(st.toString()).toUtc(),
          end: DateTime.parse(en.toString()).toUtc(),
        ));
      }
    }

    final slots = <BookingSlot>[];
    final now = tz.TZDateTime.now(location);
    var day = tz.TZDateTime(location, now.year, now.month, now.day);

    for (var d = 0; d < 21; d++) {
      final key =
          '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';
      if (!excluded.contains(key)) {
        final dow = day.weekday % 7;
        for (final rule in rules) {
          if ((rule['day_of_week'] as num).toInt() != dow) continue;
          final startT = _parseTime(rule['start_time']);
          final endT = _parseTime(rule['end_time']);
          var cursor = tz.TZDateTime(
            location,
            day.year,
            day.month,
            day.day,
            startT.hour,
            startT.minute,
          );
          final dayEnd = tz.TZDateTime(
            location,
            day.year,
            day.month,
            day.day,
            endT.hour,
            endT.minute,
          );
          while (cursor.isBefore(dayEnd)) {
            final slotEnd = cursor.add(Duration(minutes: durationMin));
            if (slotEnd.isAfter(dayEnd)) break;
            if (!slotEnd.isBefore(now)) {
              var overlaps = false;
              for (final b in busy) {
                if (cursor.isBefore(b.end) && slotEnd.isAfter(b.start)) {
                  overlaps = true;
                  break;
                }
              }
              if (!overlaps) {
                slots.add(
                  BookingSlot(
                    id: '$bookingPageId|${cursor.toUtc().toIso8601String()}',
                    bookingPageId: bookingPageId,
                    startsAt: cursor.toUtc(),
                    endsAt: slotEnd.toUtc(),
                    capacity: 1,
                    bookedCount: 0,
                  ),
                );
              }
            }
            cursor = slotEnd;
          }
        }
      }
      day = tz.TZDateTime(location, day.year, day.month, day.day + 1);
    }

    return slots;
  }

  tz.Location _location(String? name) {
    if (name == null || name.isEmpty) return tz.UTC;
    try {
      return tz.getLocation(name);
    } catch (_) {
      return tz.UTC;
    }
  }

  ({int hour, int minute}) _parseTime(dynamic v) {
    final s = v.toString();
    final parts = s.split(':');
    final h = int.parse(parts[0]);
    final m = parts.length > 1 ? int.parse(parts[1].split('.').first) : 0;
    return (hour: h, minute: m);
  }

  /// Inserts the booking, then asks the API to email a calendar file.
  /// Returns whether that email was sent. The booking stands either way.
  Future<bool> confirmBooking({
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
    final email = guestEmail.trim();
    await _client.from('bookings').insert({
      'booking_link_id': bookingPageId,
      'booker_name': (guestName?.trim().isNotEmpty ?? false)
          ? guestName!.trim()
          : 'Guest',
      'booker_email': email,
      'start_time': slot.startsAt.toUtc().toIso8601String(),
      'end_time': slot.endsAt.toUtc().toIso8601String(),
      'timezone': tz,
      'status': 'confirmed',
    });
    return requestBookingConfirmation(
      bookingLinkId: bookingPageId,
      start: slot.startsAt,
      bookerEmail: email,
    );
  }
}
