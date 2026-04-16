import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'calendar_refresh_provider.dart';
import '../config/daypilot_env.dart';
import 'bootstrap_providers.dart';
import 'repository_providers.dart';

enum ApiSessionSyncStatus {
  idle,
  syncing,
  ready,
  failed,
}

@immutable
class ApiSessionSyncState {
  const ApiSessionSyncState({
    this.status = ApiSessionSyncStatus.idle,
    this.error,
  });

  final ApiSessionSyncStatus status;
  final Object? error;

  bool get showDashboardBanner =>
      DayPilotEnv.hasDaypilotApi &&
      status == ApiSessionSyncStatus.failed &&
      error != null;

  ApiSessionSyncState copyWith({
    ApiSessionSyncStatus? status,
    Object? error,
    bool clearError = false,
  }) {
    return ApiSessionSyncState(
      status: status ?? this.status,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Tracks Supabase → Nest exchange (Option C) and drives Retry / banner UX.
final apiSessionSyncProvider =
    NotifierProvider<ApiSessionSyncNotifier, ApiSessionSyncState>(
  ApiSessionSyncNotifier.new,
);

class ApiSessionSyncNotifier extends Notifier<ApiSessionSyncState> {
  @override
  ApiSessionSyncState build() => const ApiSessionSyncState();

  void resetForSignedOut() {
    state = const ApiSessionSyncState();
  }

  /// Exchanges tokens; on success bumps calendar version so all tabs refetch.
  Future<void> sync() async {
    if (!DayPilotEnv.hasDaypilotApi) {
      state = const ApiSessionSyncState(status: ApiSessionSyncStatus.ready);
      return;
    }
    final supabaseSession = ref.read(supabaseClientProvider).auth.currentSession;
    if (supabaseSession == null) {
      state = const ApiSessionSyncState(status: ApiSessionSyncStatus.idle);
      return;
    }

    state = state.copyWith(
      status: ApiSessionSyncStatus.syncing,
      clearError: true,
    );
    try {
      await ref.read(authRepositoryProvider).syncApiSessionStrict();
      state = const ApiSessionSyncState(status: ApiSessionSyncStatus.ready);
      ref.read(calendarDataVersionProvider.notifier).bump();
    } catch (e) {
      state = ApiSessionSyncState(
        status: ApiSessionSyncStatus.failed,
        error: e,
      );
    }
  }
}
