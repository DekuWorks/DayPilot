import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// DayPilot brand tokens — dark UI + electric green (aligned with web tokens.css).
abstract final class DayPilotColors {
  static const Color brand400 = Color(0xFF8CFF3F);
  static const Color brand500 = Color(0xFF42E85F);
  static const Color brand600 = Color(0xFF16B947);

  static const Color backgroundPrimary = Color(0xFF0A0B0D);
  static const Color backgroundSecondary = Color(0xFF101215);
  static const Color surfacePrimary = Color(0xFF14161A);
  static const Color surfaceSecondary = Color(0xFF1A1D23);
  static const Color borderSubtle = Color(0xFF2A2F38);
  static const Color borderStrong = Color(0xFF3D4450);

  static const Color textPrimary = Color(0xFFF4F5F7);
  static const Color textSecondary = Color(0xFF9AA3B2);
  static const Color textTertiary = Color(0xFF6B7380);
  static const Color textInverse = Color(0xFF0A0B0D);

  static const Color meetings = Color(0xFF3B82F6);
  static const Color projects = Color(0xFFA855F7);
  static const Color focus = Color(0xFF22D3EE);
  static const Color warning = Color(0xFFF5A524);
  static const Color error = Color(0xFFF04438);

  /// Primary brand gradient (logo / CTAs)
  static const LinearGradient brandGradient = LinearGradient(
    colors: [brand400, brand500],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Legacy aliases (remove after full screen rebrand)
  static const Color ink = textPrimary;
  static const Color teal = brand500;
  static const Color gold = brand400;
  static const Color cream = backgroundPrimary;
  static const Color creamLight = surfacePrimary;
  static const Color bodyMuted = textSecondary;
  static const Color darkTeal = brand600;
}

abstract final class AppTheme {
  /// Primary DayPilot experience (dark + electric green).
  static ThemeData dark() {
    final scheme = ColorScheme.dark(
      primary: DayPilotColors.brand500,
      onPrimary: DayPilotColors.textInverse,
      secondary: DayPilotColors.brand400,
      onSecondary: DayPilotColors.textInverse,
      surface: DayPilotColors.surfacePrimary,
      onSurface: DayPilotColors.textPrimary,
      onSurfaceVariant: DayPilotColors.textSecondary,
      outline: DayPilotColors.borderSubtle,
      outlineVariant: DayPilotColors.borderStrong,
      error: DayPilotColors.error,
      onError: DayPilotColors.textPrimary,
    );

    final textTheme = GoogleFonts.interTextTheme(ThemeData.dark().textTheme)
        .apply(
          bodyColor: DayPilotColors.textPrimary,
          displayColor: DayPilotColors.textPrimary,
        );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      brightness: Brightness.dark,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: DayPilotColors.backgroundPrimary,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: DayPilotColors.backgroundPrimary.withValues(alpha: 0.92),
        foregroundColor: DayPilotColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w700,
          fontSize: 22,
          color: DayPilotColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: DayPilotColors.surfacePrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DayPilotColors.borderSubtle),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DayPilotColors.surfaceSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: DayPilotColors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: DayPilotColors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: DayPilotColors.brand500, width: 2),
        ),
        labelStyle: const TextStyle(color: DayPilotColors.textSecondary),
        floatingLabelStyle: const TextStyle(color: DayPilotColors.brand500),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          foregroundColor: DayPilotColors.textInverse,
          backgroundColor: DayPilotColors.brand500,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          minimumSize: const Size(44, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: DayPilotColors.brand500,
          side: const BorderSide(color: DayPilotColors.brand500, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          minimumSize: const Size(44, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: DayPilotColors.brand500,
        unselectedLabelColor: DayPilotColors.textSecondary,
        indicatorColor: DayPilotColors.brand500,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: DayPilotColors.surfacePrimary,
        indicatorColor: DayPilotColors.brand500.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected
                ? DayPilotColors.brand500
                : DayPilotColors.textSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected
                ? DayPilotColors.brand500
                : DayPilotColors.textSecondary,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: DayPilotColors.surfaceSecondary,
        contentTextStyle: const TextStyle(color: DayPilotColors.textPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  /// Optional light theme (architecturally available; dark is primary).
  static ThemeData light() {
    final scheme = ColorScheme.light(
      primary: DayPilotColors.brand600,
      onPrimary: Colors.white,
      secondary: DayPilotColors.brand500,
      onSecondary: DayPilotColors.textInverse,
      surface: const Color(0xFFF4F5F7),
      onSurface: DayPilotColors.textInverse,
      onSurfaceVariant: DayPilotColors.textTertiary,
      outline: DayPilotColors.borderSubtle,
    );

    final textTheme = GoogleFonts.interTextTheme().apply(
      bodyColor: DayPilotColors.textInverse,
      displayColor: DayPilotColors.textInverse,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: const Color(0xFFF7F8FA),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: DayPilotColors.textInverse,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w700,
          fontSize: 22,
          color: DayPilotColors.textInverse,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: DayPilotColors.brand600,
          minimumSize: const Size(44, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
