import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/local_notifications_service.dart';
import '../services/push_notification_service.dart';
import 'bootstrap_providers.dart';

const kNotificationsEnabledPrefsKey = 'daypilot_notifications_enabled';

class NotificationPreference {
  const NotificationPreference({
    required this.enabled,
    this.showSettingsHint = false,
    this.busy = false,
  });

  final bool enabled;
  final bool showSettingsHint;
  final bool busy;

  NotificationPreference copyWith({
    bool? enabled,
    bool? showSettingsHint,
    bool? busy,
  }) {
    return NotificationPreference(
      enabled: enabled ?? this.enabled,
      showSettingsHint: showSettingsHint ?? this.showSettingsHint,
      busy: busy ?? this.busy,
    );
  }
}

/// OS permission + optional FCM register. Overridden in tests.
abstract class NotificationPermissionClient {
  Future<bool> requestAndRegister();
  Future<bool> isGranted();
}

class DeviceNotificationPermissionClient implements NotificationPermissionClient {
  DeviceNotificationPermissionClient({
    required this.local,
    this.push,
  });

  final LocalNotificationsService local;
  final PushNotificationService? push;

  @override
  Future<bool> requestAndRegister() async {
    final granted = await local.requestPermission();
    if (!granted) return false;
    if (push != null) {
      try {
        await push!.requestPermissionAndListen();
      } catch (_) {
        // Local permission already granted — toggle stays on.
      }
    }
    return true;
  }

  @override
  Future<bool> isGranted() => local.hasPermission();
}

final localNotificationsServiceProvider =
    Provider<LocalNotificationsService>((ref) {
  return LocalNotificationsService();
});

final pushNotificationServiceProvider =
    Provider<PushNotificationService?>((ref) => null);

final notificationPermissionClientProvider =
    Provider<NotificationPermissionClient>((ref) {
  return DeviceNotificationPermissionClient(
    local: ref.watch(localNotificationsServiceProvider),
    push: ref.watch(pushNotificationServiceProvider),
  );
});

/// Persisted opt-in. Default off so we never prompt until Settings → On.
class NotificationPreferenceController
    extends Notifier<NotificationPreference> {
  @override
  NotificationPreference build() {
    final enabled = ref
            .watch(sharedPreferencesProvider)
            .getBool(kNotificationsEnabledPrefsKey) ??
        false;
    return NotificationPreference(enabled: enabled);
  }

  Future<void> setEnabled(bool on) async {
    if (state.busy) return;
    if (!on) {
      state = const NotificationPreference(enabled: false);
      await _persist(false);
      try {
        await ref.read(localNotificationsServiceProvider).cancelAllScheduled();
      } catch (_) {}
      return;
    }

    state = state.copyWith(busy: true, showSettingsHint: false);
    final granted =
        await ref.read(notificationPermissionClientProvider).requestAndRegister();
    if (!granted) {
      state = const NotificationPreference(
        enabled: false,
        showSettingsHint: true,
      );
      await _persist(false);
      return;
    }
    state = const NotificationPreference(enabled: true);
    await _persist(true);
  }

  /// If OS permission was revoked after opt-in, turn the switch off.
  Future<void> reconcileWithSystem() async {
    if (!state.enabled) return;
    final granted =
        await ref.read(notificationPermissionClientProvider).isGranted();
    if (granted) return;
    state = const NotificationPreference(
      enabled: false,
      showSettingsHint: true,
    );
    await _persist(false);
  }

  Future<void> _persist(bool enabled) async {
    await ref.read(sharedPreferencesProvider).setBool(
          kNotificationsEnabledPrefsKey,
          enabled,
        );
    await _syncPreferencesRow(enabled);
  }

  Future<void> _syncPreferencesRow(bool enabled) async {
    try {
      final client = ref.read(supabaseClientProvider);
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;
      await client.from('preferences').upsert({
        'user_id': uid,
        'notification_preferences': {'enabled': enabled},
      });
    } catch (_) {
      // Local preference still applies if the row write fails.
    }
  }
}

final notificationPreferenceProvider = NotifierProvider<
    NotificationPreferenceController, NotificationPreference>(
  NotificationPreferenceController.new,
);
