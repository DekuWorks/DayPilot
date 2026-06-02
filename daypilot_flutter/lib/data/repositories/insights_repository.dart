import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/insight_snapshot.dart';
import 'event_repository.dart';

/// Upcoming-event counts from [EventRepository] — Nest API under Option C,
/// Supabase `events` table otherwise.
class InsightsRepository {
  InsightsRepository(this._events, this._client);

  final EventRepository _events;
  final SupabaseClient _client;

  Future<InsightSnapshot?> getLatest() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;

    final now = DateTime.now().toUtc();
    final horizon = now.add(const Duration(days: 7));
    final events = await _events.listForRange(from: now, to: horizon);
    final upcoming = events.where((e) {
      final start = e.startsAt.toUtc();
      return !start.isBefore(now) && !start.isAfter(horizon);
    }).toList();

    return InsightSnapshot(
      id: 'derived-${now.millisecondsSinceEpoch}',
      userId: uid,
      capturedAt: now,
      headline: 'Next 7 days',
      metrics: {
        'upcoming_event_count': upcoming.length,
      },
    );
  }

  Future<List<InsightSnapshot>> history({int limit = 30}) async {
    final latest = await getLatest();
    if (latest == null) return [];
    return [latest];
  }
}
