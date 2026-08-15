import 'package:daypilot_flutter/features/calendar/calendar_chip_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses stored calendar hex, not provider brand', () {
    final red = calendarChipStyleFor(
      calendarColor: '#E74C3C',
      source: 'apple_eventkit',
    );
    final green = calendarChipStyleFor(
      calendarColor: '#27AE60',
      source: 'apple_eventkit',
    );
    expect(red.accent, const Color(0xFFE74C3C));
    expect(green.accent, const Color(0xFF27AE60));
    expect(red.accent, isNot(green.accent));
  });

  test('same calendar id hashes to the same fallback colour', () {
    final a = calendarChipStyleFor(
      externalCalendarId: 'work-cal',
      source: 'google',
    );
    final b = calendarChipStyleFor(
      externalCalendarId: 'work-cal',
      source: 'google',
    );
    final other = calendarChipStyleFor(
      externalCalendarId: 'personal-cal',
      source: 'google',
    );
    expect(a.accent, b.accent);
    expect(a.accent, isNot(other.accent));
  });

  test('native events stay brand green', () {
    final chip = calendarChipStyleFor(source: 'native');
    expect(chip.accent, kNativeCalendarColor);
  });

  test('parseCalendarHex accepts 6-digit and strips alpha', () {
    expect(parseCalendarHex('#27AE60'), const Color(0xFF27AE60));
    expect(parseCalendarHex('FF27AE60'), const Color(0xFF27AE60));
    expect(parseCalendarHex('not-a-color'), isNull);
  });
}
