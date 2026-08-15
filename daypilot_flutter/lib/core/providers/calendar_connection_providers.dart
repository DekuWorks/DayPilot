import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/calendar_connections_repository.dart';
import '../../data/services/calendar_sync_service.dart';
import '../config/daypilot_env.dart';
import 'repository_providers.dart';

final calendarConnectionsProvider =
    FutureProvider.autoDispose<List<CalendarConnection>>((ref) {
  return ref.watch(calendarConnectionsRepositoryProvider).listConnections();
});

/// Same EventKit source Sync already uses (`/calendar-connections/apple/eventkit`).
final eventKitStatusProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  if (!DayPilotEnv.hasDaypilotApi) return null;
  try {
    return await ref
        .watch(calendarConnectionsRepositoryProvider)
        .getEventKitStatus();
  } catch (_) {
    return null;
  }
});

final calendarSyncServiceProvider = Provider<CalendarSyncService>((ref) {
  return CalendarSyncService(ref.watch(calendarConnectionsRepositoryProvider));
});

void invalidateCalendarStatus(WidgetRef ref) {
  ref.invalidate(calendarConnectionsProvider);
  ref.invalidate(eventKitStatusProvider);
}
