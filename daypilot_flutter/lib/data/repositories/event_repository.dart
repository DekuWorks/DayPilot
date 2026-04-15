import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/event_record.dart';

class EventRepository {
  EventRepository(this._client);

  final SupabaseClient _client;

  Future<String?> _defaultCalendarId(String userId) async {
    final def = await _client
        .from('calendars')
        .select('id')
        .eq('owner_id', userId)
        .eq('is_default', true)
        .maybeSingle();
    if (def != null) return def['id'] as String?;
    final any = await _client
        .from('calendars')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();
    return any?['id'] as String?;
  }

  Future<List<EventRecord>> listForRange({
    required DateTime from,
    required DateTime to,
  }) async {
    final fromIso = from.toUtc().toIso8601String();
    final toIso = to.toUtc().toIso8601String();
    final rows = await _client
        .from('events')
        .select(
          'id, title, description, location, start, end, start_time, end_time, user_id, calendar_id, all_day, status',
        )
        .gte('start', fromIso)
        .lte('start', toIso)
        .order('start', ascending: true);
    final list = (rows as List<dynamic>)
        .map((e) => EventRecord.fromSupabaseRow(Map<String, dynamic>.from(e as Map)))
        .toList();
    return list;
  }

  Future<EventRecord?> getById(String id) async {
    final row = await _client
        .from('events')
        .select(
          'id, title, description, location, start, end, start_time, end_time, user_id, calendar_id, all_day, status',
        )
        .eq('id', id)
        .maybeSingle();
    if (row == null) return null;
    return EventRecord.fromSupabaseRow(Map<String, dynamic>.from(row));
  }

  Future<EventRecord> create(EventRecord draft) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    final calendarId = draft.calendarId ?? await _defaultCalendarId(uid);
    if (calendarId == null) {
      throw Exception('No calendar found. Sign up again or create a calendar in Supabase.');
    }
    final row = await _client
        .from('events')
        .insert(draft.toInsertRow(calendarId: calendarId, userId: uid))
        .select(
          'id, title, description, location, start, end, start_time, end_time, user_id, calendar_id, all_day, status',
        )
        .single();
    return EventRecord.fromSupabaseRow(Map<String, dynamic>.from(row));
  }

  Future<EventRecord> update(EventRecord event) async {
    final row = await _client
        .from('events')
        .update(event.toUpdateRow())
        .eq('id', event.id)
        .select(
          'id, title, description, location, start, end, start_time, end_time, user_id, calendar_id, all_day, status',
        )
        .single();
    return EventRecord.fromSupabaseRow(Map<String, dynamic>.from(row));
  }

  Future<void> delete(String id) async {
    await _client.from('events').delete().eq('id', id);
  }
}
