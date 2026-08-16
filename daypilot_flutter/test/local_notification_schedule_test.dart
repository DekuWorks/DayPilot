import 'package:daypilot_flutter/core/services/local_notifications_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reminderTime is 15 minutes before and skips the past', () {
    final now = DateTime(2026, 8, 15, 10, 0);
    expect(
      reminderTime(startsAt: DateTime(2026, 8, 15, 11, 0), now: now),
      DateTime(2026, 8, 15, 10, 45),
    );
    expect(
      reminderTime(startsAt: DateTime(2026, 8, 15, 10, 10), now: now),
      isNull,
    );
  });

  test('nextMorningBriefs skips today’s 8am when already past', () {
    final afterEight = DateTime(2026, 8, 15, 9, 0);
    final mornings = nextMorningBriefs(now: afterEight, days: 2);
    expect(mornings, [
      DateTime(2026, 8, 16, 8),
      DateTime(2026, 8, 17, 8),
    ]);

    final beforeEight = DateTime(2026, 8, 15, 7, 0);
    expect(nextMorningBriefs(now: beforeEight, days: 1).first, DateTime(2026, 8, 15, 8));
  });
}
