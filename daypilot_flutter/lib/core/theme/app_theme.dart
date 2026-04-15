import 'package:flutter/material.dart';

abstract final class AppTheme {
  static const Color _seedLight = Color(0xFF2563EB);
  static const Color _seedDark = Color(0xFF60A5FA);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: _seedLight,
      brightness: Brightness.light,
    );
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: _seedDark,
      brightness: Brightness.dark,
    );
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );
  }
}
