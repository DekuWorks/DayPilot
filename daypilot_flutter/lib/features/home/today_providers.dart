import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/bootstrap_providers.dart';

/// Completed focus seconds since local midnight. Throws when the read fails,
/// so Today can show "Unavailable" instead of a made-up zero.
final todayFocusSecondsProvider = FutureProvider.autoDispose<int>((ref) async {
  final now = DateTime.now();
  final from = DateTime(now.year, now.month, now.day).toIso8601String();
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('focus_sessions')
      .select('duration_seconds, status')
      .gte('started_at', from)
      .eq('status', 'completed')
      .limit(100);
  var total = 0;
  for (final row in rows as List) {
    total += ((row as Map)['duration_seconds'] as num?)?.toInt() ?? 0;
  }
  return total;
});
