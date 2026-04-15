import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/insight_snapshot.dart';

/// Uses `events` aggregates — no dedicated insights table in legacy schema.
class InsightsRepository {
  InsightsRepository(this._client);

  final SupabaseClient _client;

  Future<InsightSnapshot?> getLatest() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final now = DateTime.now().toUtc();
    final horizon = now.add(const Duration(days: 7)).toIso8601String();
    final rows = await _client
        .from('events')
        .select('id, start')
        .gte('start', now.toIso8601String())
        .lte('start', horizon)
        .order('start', ascending: true)
        .limit(200);
    final list = rows as List<dynamic>;
    return InsightSnapshot(
      id: 'derived-${now.millisecondsSinceEpoch}',
      userId: uid,
      capturedAt: now,
      headline: 'Next 7 days',
      metrics: {
        'upcoming_event_count': list.length,
      },
    );
  }

  Future<List<InsightSnapshot>> history({int limit = 30}) async {
    final latest = await getLatest();
    if (latest == null) return [];
    return [latest];
  }
}
