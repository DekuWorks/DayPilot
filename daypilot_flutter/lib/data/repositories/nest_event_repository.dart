import 'dart:convert';

import '../../core/config/nest_api_session.dart';
import '../../domain/models/event_record.dart';
import 'event_repository.dart';

/// Events via Nest API (Prisma). Requires [NestApiSession] after Supabase exchange.
class NestEventRepository implements EventRepository {
  NestEventRepository(this._session);

  final NestApiSession _session;

  @override
  Future<List<EventRecord>> listForRange({
    required DateTime from,
    required DateTime to,
  }) async {
    final res = await _session.get(
      '/events',
      query: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to load events: ${res.body}');
    }
    final list = jsonDecode(res.body) as List<dynamic>;
    return list
        .map((e) => EventRecord.fromNestJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  @override
  Future<EventRecord?> getById(String id) async {
    final res = await _session.get('/events/$id');
    if (res.statusCode == 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to load event: ${res.body}');
    }
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    return EventRecord.fromNestJson(json);
  }

  @override
  Future<EventRecord> create(EventRecord draft) async {
    final body = <String, dynamic>{
      'title': draft.title,
      'start': draft.startsAt.toUtc().toIso8601String(),
      'end': draft.endsAt.toUtc().toIso8601String(),
      if (draft.description != null && draft.description!.isNotEmpty)
        'description': draft.description,
      if (draft.location != null && draft.location!.isNotEmpty)
        'location': draft.location,
    };
    final res = await _session.post('/events', body: body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to create event: ${res.body}');
    }
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    return EventRecord.fromNestJson(json);
  }

  @override
  Future<EventRecord> update(EventRecord event) async {
    final body = <String, dynamic>{
      'title': event.title,
      'start': event.startsAt.toUtc().toIso8601String(),
      'end': event.endsAt.toUtc().toIso8601String(),
      if (event.description != null) 'description': event.description,
      if (event.location != null) 'location': event.location,
    };
    final res = await _session.patch('/events/${event.id}', body: body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to update event: ${res.body}');
    }
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    return EventRecord.fromNestJson(json);
  }

  @override
  Future<void> delete(String id) async {
    final res = await _session.delete('/events/$id');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to delete event: ${res.body}');
    }
  }
}
