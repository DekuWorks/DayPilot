import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Matches [apps/web/src/app/globals.css] and marketing UI (teal + gold + cream).
abstract final class DayPilotColors {
  static const Color ink = Color(0xFF2B3448);
  static const Color teal = Color(0xFF4FB3B3);
  static const Color gold = Color(0xFFEFBF4D);
  static const Color cream = Color(0xFFF5E6D3);
  static const Color creamLight = Color(0xFFEFEBE2);
  static const Color bodyMuted = Color(0xFF4F4F4F);
  static const Color darkTeal = Color(0xFF1D5A6E);

  /// Web `.gradient-text` / hero CTA
  static const LinearGradient brandGradient = LinearGradient(
    colors: [gold, teal],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );
}

abstract final class AppTheme {
  static ThemeData light() {
    final scheme = ColorScheme.light(
      primary: DayPilotColors.teal,
      onPrimary: Colors.white,
      secondary: DayPilotColors.gold,
      onSecondary: DayPilotColors.ink,
      surface: DayPilotColors.creamLight,
      onSurface: DayPilotColors.ink,
      onSurfaceVariant: DayPilotColors.bodyMuted,
      outline: DayPilotColors.teal.withValues(alpha: 0.35),
      outlineVariant: DayPilotColors.teal.withValues(alpha: 0.2),
    );

    final textTheme = GoogleFonts.interTextTheme().apply(
      bodyColor: DayPilotColors.ink,
      displayColor: DayPilotColors.ink,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: DayPilotColors.cream,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: Colors.white.withValues(alpha: 0.55),
        foregroundColor: DayPilotColors.ink,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w700,
          fontSize: 22,
          color: DayPilotColors.ink,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white.withValues(alpha: 0.85),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: Colors.white.withValues(alpha: 0.35),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: DayPilotColors.teal.withValues(alpha: 0.3),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: DayPilotColors.teal.withValues(alpha: 0.3),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: DayPilotColors.teal, width: 2),
        ),
        labelStyle: const TextStyle(color: DayPilotColors.bodyMuted),
        floatingLabelStyle: const TextStyle(color: DayPilotColors.teal),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: DayPilotColors.teal,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: DayPilotColors.ink,
          side: const BorderSide(color: DayPilotColors.teal, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: DayPilotColors.teal,
        unselectedLabelColor: DayPilotColors.bodyMuted,
        indicatorColor: DayPilotColors.teal,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.dark(
      primary: DayPilotColors.teal,
      onPrimary: DayPilotColors.ink,
      secondary: DayPilotColors.gold,
      onSecondary: DayPilotColors.ink,
      surface: const Color(0xFF1A2332),
      onSurface: DayPilotColors.creamLight,
      onSurfaceVariant: DayPilotColors.cream.withValues(alpha: 0.85),
        outline: DayPilotColors.teal.withValues(alpha: 0.45),
    );

    final textTheme = GoogleFonts.interTextTheme(ThemeData.dark().textTheme)
        .apply(
          bodyColor: DayPilotColors.creamLight,
          displayColor: DayPilotColors.creamLight,
        );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: const Color(0xFF151C28),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        backgroundColor: const Color(0xFF151C28).withValues(alpha: 0.9),
        foregroundColor: DayPilotColors.creamLight,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w700,
          fontSize: 22,
          color: DayPilotColors.creamLight,
        ),
      ),
    );
  }
}
