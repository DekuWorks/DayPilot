import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/bootstrap_providers.dart';

const kThemeModePrefsKey = 'theme_mode';

/// Persisted appearance. Default is dark so existing testers are not surprised.
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(kThemeModePrefsKey);
    return parseThemeMode(raw);
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await ref.read(sharedPreferencesProvider).setString(
          kThemeModePrefsKey,
          persistThemeMode(mode),
        );
    await _syncPreferencesRow(mode);
  }

  Future<void> setLight(bool light) =>
      setMode(light ? ThemeMode.light : ThemeMode.dark);

  Future<void> _syncPreferencesRow(ThemeMode mode) async {
    try {
      final client = ref.read(supabaseClientProvider);
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;
      await client.from('preferences').upsert({
        'user_id': uid,
        'theme': persistThemeMode(mode),
      });
    } catch (_) {
      // Local preference still applies if the row write fails.
    }
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);

ThemeMode parseThemeMode(String? raw) {
  switch (raw) {
    case 'light':
      return ThemeMode.light;
    case 'system':
      return ThemeMode.system;
    default:
      return ThemeMode.dark;
  }
}

String persistThemeMode(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.system:
      return 'system';
    case ThemeMode.dark:
      return 'dark';
  }
}
