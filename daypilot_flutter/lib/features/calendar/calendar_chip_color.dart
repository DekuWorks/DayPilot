import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/models/event_record.dart';

/// Fallback palette when a calendar has no stored colour.
/// Same calendar id always maps to the same swatch — never per-event random.
const kCalendarFallbackPalette = <int>[
  0xFFE74C3C, // red
  0xFF27AE60, // green
  0xFF3B82F6, // blue
  0xFF94A3B8, // grey
  0xFF38BDF8, // light blue
  0xFFA855F7, // purple
  0xFFF59E0B, // amber
  0xFFEC4899, // pink
  0xFF14B8A6, // teal
  0xFFF97316, // orange
];

const kNativeCalendarColor = Color(0xFF39FF14);

class CalendarChipStyle {
  const CalendarChipStyle({
    required this.fill,
    required this.accent,
    required this.foreground,
  });

  final Color fill;
  final Color accent;
  final Color foreground;
}

/// Resolves chip colour from the source calendar, not the provider brand.
CalendarChipStyle calendarChipStyleFor({
  String? calendarColor,
  String? externalCalendarId,
  String? calendarId,
  String source = 'native',
  bool lightSurface = false,
}) {
  final parsed = parseCalendarHex(calendarColor);
  final Color accent;
  if (parsed != null) {
    accent = parsed;
  } else if (source == 'native' || source == 'booking') {
    accent = kNativeCalendarColor;
  } else {
    final key = (externalCalendarId ?? calendarId ?? source).trim();
    accent = key.isEmpty
        ? kNativeCalendarColor
        : Color(kCalendarFallbackPalette[stableHash(key) %
            kCalendarFallbackPalette.length]);
  }

  final fill = Color.alphaBlend(
    accent.withValues(alpha: lightSurface ? 0.22 : 0.32),
    lightSurface ? Colors.white : const Color(0xFF111111),
  );
  return CalendarChipStyle(
    fill: fill,
    accent: accent,
    foreground: contrastingOn(fill),
  );
}

CalendarChipStyle calendarChipStyleForEvent(
  EventRecord event, {
  required bool lightSurface,
}) {
  return calendarChipStyleFor(
    calendarColor: event.calendarColor,
    externalCalendarId: event.externalCalendarId,
    calendarId: event.calendarId,
    source: event.source,
    lightSurface: lightSurface,
  );
}

Color contrastingOn(Color background) {
  final l = background.computeLuminance();
  return l > 0.55 ? const Color(0xFF0A0B0D) : Colors.white;
}

Color? parseCalendarHex(String? raw) {
  if (raw == null) return null;
  var hex = raw.trim();
  if (hex.isEmpty) return null;
  if (hex.startsWith('#')) hex = hex.substring(1);
  if (hex.length == 3) {
    hex = hex.split('').map((c) => '$c$c').join();
  }
  if (hex.length == 8) hex = hex.substring(2);
  if (hex.length != 6) return null;
  final value = int.tryParse(hex, radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}

int stableHash(String input) {
  var hash = 5381;
  for (final unit in input.codeUnits) {
    hash = ((hash << 5) + hash + unit) & 0x7fffffff;
  }
  return hash;
}

/// Brand-green “today” cell wash — selection, not event colour.
Color todayCellWash(BuildContext context) {
  return DayPilotScheme.of(context).accent.withValues(alpha: 0.14);
}
