import 'package:daypilot_flutter/core/providers/bootstrap_providers.dart';
import 'package:daypilot_flutter/core/providers/notification_preference_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeGate implements NotificationPermissionClient {
  _FakeGate({this.grant = true});

  bool grant;
  int requestCount = 0;

  @override
  Future<bool> requestAndRegister() async {
    requestCount += 1;
    return grant;
  }

  @override
  Future<bool> isGranted() async => grant;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProviderContainer> containerWith({
    required SharedPreferences prefs,
    required NotificationPermissionClient gate,
  }) async {
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        notificationPermissionClientProvider.overrideWithValue(gate),
      ],
    );
    return container;
  }

  test('defaults off and persists on after permission grant', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final gate = _FakeGate();
    final container = await containerWith(prefs: prefs, gate: gate);
    addTearDown(container.dispose);

    expect(container.read(notificationPreferenceProvider).enabled, isFalse);

    await container.read(notificationPreferenceProvider.notifier).setEnabled(true);
    expect(container.read(notificationPreferenceProvider).enabled, isTrue);
    expect(container.read(notificationPreferenceProvider).showSettingsHint, isFalse);
    expect(prefs.getBool(kNotificationsEnabledPrefsKey), isTrue);
    expect(gate.requestCount, 1);

    final reloaded = await containerWith(prefs: prefs, gate: gate);
    addTearDown(reloaded.dispose);
    expect(reloaded.read(notificationPreferenceProvider).enabled, isTrue);
  });

  test('denied permission leaves switch off and shows Settings hint', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final gate = _FakeGate(grant: false);
    final container = await containerWith(prefs: prefs, gate: gate);
    addTearDown(container.dispose);

    await container.read(notificationPreferenceProvider.notifier).setEnabled(true);
    final state = container.read(notificationPreferenceProvider);
    expect(state.enabled, isFalse);
    expect(state.showSettingsHint, isTrue);
    expect(prefs.getBool(kNotificationsEnabledPrefsKey), isFalse);
  });

  test('turning off persists without requesting permission', () async {
    SharedPreferences.setMockInitialValues({
      kNotificationsEnabledPrefsKey: true,
    });
    final prefs = await SharedPreferences.getInstance();
    final gate = _FakeGate();
    final container = await containerWith(prefs: prefs, gate: gate);
    addTearDown(container.dispose);

    expect(container.read(notificationPreferenceProvider).enabled, isTrue);
    await container.read(notificationPreferenceProvider.notifier).setEnabled(false);
    expect(container.read(notificationPreferenceProvider).enabled, isFalse);
    expect(prefs.getBool(kNotificationsEnabledPrefsKey), isFalse);
    expect(gate.requestCount, 0);
  });
}
