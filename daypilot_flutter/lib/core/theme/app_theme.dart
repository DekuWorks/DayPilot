import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Brand accents that stay the same in light and dark.
abstract final class DayPilotColors {
  static const Color brand400 = Color(0xFF6CFF4A);
  static const Color brand500 = Color(0xFF39FF14);
  static const Color brand600 = Color(0xFF16B947);

  static const Color meetings = Color(0xFF3B82F6);
  static const Color projects = Color(0xFFA855F7);
  static const Color focus = Color(0xFF22D3EE);
  static const Color warning = Color(0xFFF5A524);
  static const Color error = Color(0xFFFF4B4B);
  static const Color nowLine = Color(0xFFFF4B4B);

  static const LinearGradient brandGradient = LinearGradient(
    colors: [Color(0xFF3D9B6A), Color(0xFF1B7A4A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Legacy aliases used by ThemeData construction and non-context colours.
  static const Color teal = brand500;
  static const Color gold = brand400;
  static const Color darkTeal = brand600;
}

/// Surfaces and text that flip with [ThemeMode].
@immutable
class DayPilotScheme extends ThemeExtension<DayPilotScheme> {
  const DayPilotScheme({
    required this.backgroundPrimary,
    required this.backgroundSecondary,
    required this.surfacePrimary,
    required this.surfaceSecondary,
    required this.borderSubtle,
    required this.borderStrong,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.textInverse,
    required this.accent,
  });

  final Color backgroundPrimary;
  final Color backgroundSecondary;
  final Color surfacePrimary;
  final Color surfaceSecondary;
  final Color borderSubtle;
  final Color borderStrong;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color textInverse;
  /// Forest sage in both themes. Dark uses a slightly brighter step for contrast.
  final Color accent;

  static const DayPilotScheme dark = DayPilotScheme(
    backgroundPrimary: Color(0xFF0C1210),
    backgroundSecondary: Color(0xFF0E1612),
    surfacePrimary: Color(0xFF15201A),
    surfaceSecondary: Color(0xFF1A2620),
    borderSubtle: Color(0xFF2A3D34),
    borderStrong: Color(0xFF3D5648),
    textPrimary: Color(0xFFF4F7F5),
    textSecondary: Color(0xFF8A9A90),
    textTertiary: Color(0xFF6A7A70),
    textInverse: Color(0xFF0C1210),
    accent: Color(0xFF3D9B6A),
  );

  static const DayPilotScheme light = DayPilotScheme(
    backgroundPrimary: Color(0xFFF3F7F3),
    backgroundSecondary: Color(0xFFEEF5F0),
    surfacePrimary: Color(0xFFF7FBF7),
    surfaceSecondary: Color(0xFFE8F0EA),
    borderSubtle: Color(0xFFC5D4C8),
    borderStrong: Color(0xFF9BB5A3),
    textPrimary: Color(0xFF0A0B0D),
    textSecondary: Color(0xFF4A5A50),
    textTertiary: Color(0xFF6E8074),
    textInverse: Color(0xFFF3F7F3),
    accent: Color(0xFF1B7A4A),
  );

  static DayPilotScheme of(BuildContext context) {
    return Theme.of(context).extension<DayPilotScheme>() ?? dark;
  }

  @override
  DayPilotScheme copyWith({
    Color? backgroundPrimary,
    Color? backgroundSecondary,
    Color? surfacePrimary,
    Color? surfaceSecondary,
    Color? borderSubtle,
    Color? borderStrong,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? textInverse,
    Color? accent,
  }) {
    return DayPilotScheme(
      backgroundPrimary: backgroundPrimary ?? this.backgroundPrimary,
      backgroundSecondary: backgroundSecondary ?? this.backgroundSecondary,
      surfacePrimary: surfacePrimary ?? this.surfacePrimary,
      surfaceSecondary: surfaceSecondary ?? this.surfaceSecondary,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      borderStrong: borderStrong ?? this.borderStrong,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      textInverse: textInverse ?? this.textInverse,
      accent: accent ?? this.accent,
    );
  }

  @override
  DayPilotScheme lerp(ThemeExtension<DayPilotScheme>? other, double t) {
    if (other is! DayPilotScheme) return this;
    return DayPilotScheme(
      backgroundPrimary:
          Color.lerp(backgroundPrimary, other.backgroundPrimary, t)!,
      backgroundSecondary:
          Color.lerp(backgroundSecondary, other.backgroundSecondary, t)!,
      surfacePrimary: Color.lerp(surfacePrimary, other.surfacePrimary, t)!,
      surfaceSecondary:
          Color.lerp(surfaceSecondary, other.surfaceSecondary, t)!,
      borderSubtle: Color.lerp(borderSubtle, other.borderSubtle, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      textInverse: Color.lerp(textInverse, other.textInverse, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
    );
  }
}

extension DayPilotThemeX on BuildContext {
  DayPilotScheme get dp => DayPilotScheme.of(this);
}

abstract final class AppTheme {
  static ThemeData dark() => _build(DayPilotScheme.dark, Brightness.dark);

  static ThemeData light() => _build(DayPilotScheme.light, Brightness.light);

  static ThemeData _build(DayPilotScheme tokens, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final accent = tokens.accent;
    final scheme = isDark
        ? ColorScheme.dark(
            primary: accent,
            onPrimary: Colors.white,
            secondary: const Color(0xFF2E8B57),
            onSecondary: Colors.white,
            secondaryContainer: const Color(0xFF163D24),
            onSecondaryContainer: accent,
            primaryContainer: const Color(0xFF163D24),
            onPrimaryContainer: accent,
            surface: tokens.surfacePrimary,
            onSurface: tokens.textPrimary,
            onSurfaceVariant: tokens.textSecondary,
            outline: tokens.borderSubtle,
            outlineVariant: tokens.borderStrong,
            error: DayPilotColors.error,
            onError: tokens.textPrimary,
          )
        : ColorScheme.light(
            primary: accent,
            onPrimary: Colors.white,
            secondary: const Color(0xFF2E8B57),
            onSecondary: Colors.white,
            secondaryContainer: const Color(0xFFD8E8DE),
            onSecondaryContainer: Color(0xFF145C38),
            primaryContainer: const Color(0xFFD8E8DE),
            onPrimaryContainer: Color(0xFF145C38),
            surface: tokens.surfacePrimary,
            onSurface: tokens.textPrimary,
            onSurfaceVariant: tokens.textSecondary,
            outline: tokens.borderSubtle,
            outlineVariant: tokens.borderStrong,
            error: DayPilotColors.error,
            onError: Colors.white,
          );

    final baseText = isDark
        ? GoogleFonts.interTextTheme(ThemeData.dark().textTheme)
        : GoogleFonts.interTextTheme();
    final textTheme = baseText.apply(
      bodyColor: tokens.textPrimary,
      displayColor: tokens.textPrimary,
    );

    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      brightness: brightness,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: tokens.backgroundPrimary,
      extensions: [tokens],
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: tokens.backgroundPrimary,
        foregroundColor: tokens.textPrimary,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w700,
          fontSize: 22,
          color: tokens.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: tokens.surfacePrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: tokens.borderSubtle),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tokens.surfaceSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: tokens.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: tokens.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: accent, width: 2),
        ),
        labelStyle: TextStyle(color: tokens.textSecondary),
        floatingLabelStyle: TextStyle(color: accent),
        hintStyle: TextStyle(color: tokens.textTertiary),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          foregroundColor: isDark ? tokens.textInverse : Colors.white,
          backgroundColor: accent,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          minimumSize: const Size(44, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accent,
          side: BorderSide(color: accent, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          minimumSize: const Size(44, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return accent;
          }
          return tokens.textTertiary;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return accent.withValues(alpha: 0.35);
          }
          return tokens.borderStrong;
        }),
      ),
      chipTheme: ChipThemeData(
        selectedColor: accent,
        secondarySelectedColor: accent,
        backgroundColor: tokens.surfaceSecondary,
        disabledColor: tokens.surfaceSecondary,
        checkmarkColor: isDark ? tokens.textInverse : Colors.white,
        side: BorderSide(color: tokens.borderSubtle),
        labelStyle: TextStyle(
          color: tokens.textSecondary,
          fontWeight: FontWeight.w600,
        ),
        secondaryLabelStyle: TextStyle(
          color: isDark ? tokens.textInverse : Colors.white,
          fontWeight: FontWeight.w600,
        ),
        color: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return accent;
          }
          return tokens.surfaceSecondary;
        }),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: accent,
        unselectedLabelColor: tokens.textSecondary,
        indicatorColor: accent,
        dividerColor: Colors.transparent,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: tokens.backgroundPrimary,
        elevation: 0,
        height: 68,
        indicatorColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? accent : tokens.textTertiary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 24,
            color: selected ? accent : tokens.textTertiary,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? tokens.surfaceSecondary : tokens.textPrimary,
        contentTextStyle: TextStyle(
          color: isDark ? tokens.textPrimary : tokens.textInverse,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: accent,
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: tokens.borderSubtle,
        thickness: 1,
      ),
    );
  }
}
