import '../../domain/models/event_record.dart';

/// Calendar/event persistence — [SupabaseEventRepository] (direct DB) or
/// [NestEventRepository] (Option C: Nest API + Prisma).
abstract class EventRepository {
  Future<List<EventRecord>> listForRange({
    required DateTime from,
    required DateTime to,
  });

  Future<EventRecord?> getById(String id);

  Future<EventRecord> create(EventRecord draft);

  Future<EventRecord> update(EventRecord event);

  Future<void> delete(String id);
}
