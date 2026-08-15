import 'package:daypilot_flutter/core/providers/bootstrap_providers.dart';
import 'package:daypilot_flutter/core/theme/theme_mode_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('theme defaults to dark and persists light', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(container.dispose);

    expect(container.read(themeModeProvider), ThemeMode.dark);

    await container.read(themeModeProvider.notifier).setLight(true);
    expect(container.read(themeModeProvider), ThemeMode.light);
    expect(prefs.getString(kThemeModePrefsKey), 'light');

    final reloaded = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(reloaded.dispose);
    expect(reloaded.read(themeModeProvider), ThemeMode.light);
  });

  test('parseThemeMode treats unknown as dark', () {
    expect(parseThemeMode(null), ThemeMode.dark);
    expect(parseThemeMode('light'), ThemeMode.light);
    expect(parseThemeMode('nope'), ThemeMode.dark);
  });
}
