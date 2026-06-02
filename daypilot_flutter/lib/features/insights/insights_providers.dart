import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';

final latestInsightProvider = FutureProvider.autoDispose((ref) async {
  ref.watch(calendarDataVersionProvider);

  if (DayPilotEnv.hasDaypilotApi) {
    var sync = ref.watch(apiSessionSyncProvider);
    if (sync.status == ApiSessionSyncStatus.failed) {
      throw sync.error ?? Exception('Could not connect to DayPilot API');
    }
    final signedIn =
        ref.read(supabaseClientProvider).auth.currentSession != null;
    if (signedIn && sync.status != ApiSessionSyncStatus.ready) {
      await ref.read(apiSessionSyncProvider.notifier).sync();
      sync = ref.read(apiSessionSyncProvider);
      if (sync.status == ApiSessionSyncStatus.failed) {
        throw sync.error ?? Exception('Could not connect to DayPilot API');
      }
    }
  }

  return ref.read(insightsRepositoryProvider).getLatest();
});
