import 'package:daypilot_flutter/domain/models/booking_slot.dart';
import 'package:daypilot_flutter/features/booking/public_booking_screen.dart';
import 'package:daypilot_flutter/features/insights/insights_screen.dart';
import 'package:daypilot_flutter/features/tasks/task_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

BookingSlot slot(String id, DateTime start, {int booked = 0}) => BookingSlot(
  id: id,
  bookingPageId: 'page',
  startsAt: start,
  endsAt: start.add(const Duration(minutes: 30)),
  bookedCount: booked,
);

TaskRow task(String id, String status, DateTime? completedAt) => TaskRow(
  id: id,
  title: id,
  status: status,
  priority: 'medium',
  completedAt: completedAt,
);

void main() {
  group('booking slots', () {
    test('groups by local day, sorted, and skips empty days', () {
      final a = DateTime(2026, 10, 20, 15);
      final b = DateTime(2026, 10, 20, 9);
      final c = DateTime(2026, 10, 22, 10);
      final grouped = groupSlotsByDay([
        slot('a', a),
        slot('c', c),
        slot('b', b),
      ]);
      expect(grouped.keys, [DateTime(2026, 10, 20), DateTime(2026, 10, 22)]);
      expect(grouped[DateTime(2026, 10, 20)]!.map((s) => s.id), ['b', 'a']);
    });

    test('first open day skips a day where every slot is full', () {
      final full = slot('full', DateTime(2026, 10, 20, 9), booked: 1);
      final open = slot('open', DateTime(2026, 10, 21, 9));
      expect(firstOpenDay([full, open]), DateTime(2026, 10, 21));
      expect(firstOpenDay([full]), DateTime(2026, 10, 20));
      expect(firstOpenDay(const []), isNull);
    });

    test('method icons cover only the four supported methods', () {
      expect(meetingMethodIcon('phone'), Icons.call_outlined);
      expect(meetingMethodIcon('slack'), Icons.forum_outlined);
      expect(meetingMethodIcon('discord'), Icons.headset_mic_outlined);
      expect(meetingMethodIcon('link'), Icons.link_rounded);
    });
  });

  group('insights helpers', () {
    final now = DateTime(2026, 10, 17, 12);

    test('focus minutes land on the right day and ignore cancelled', () {
      final series = focusMinutesByDay([
        {
          'status': 'completed',
          'started_at': DateTime(2026, 10, 17, 9).toIso8601String(),
          'duration_seconds': 1800,
        },
        {
          'status': 'completed',
          'started_at': DateTime(2026, 10, 11, 9).toIso8601String(),
          'duration_seconds': 600,
        },
        {
          'status': 'cancelled',
          'started_at': DateTime(2026, 10, 16, 9).toIso8601String(),
          'duration_seconds': 3600,
        },
        {
          'status': 'completed',
          'started_at': DateTime(2026, 10, 1, 9).toIso8601String(),
          'duration_seconds': 3600,
        },
      ], now);
      expect(series.length, 7);
      expect(series[6], 30);
      expect(series[0], 10);
      expect(series.fold<double>(0, (a, b) => a + b), 40);
    });

    test('tasks completed counts only the last seven days', () {
      final list = [
        task('recent', 'completed', DateTime(2026, 10, 15, 8)),
        task('edge', 'completed', DateTime(2026, 10, 11, 8)),
        task('old', 'completed', DateTime(2026, 10, 10, 8)),
        task('no date', 'completed', null),
        task('open', 'pending', null),
      ];
      expect(completedInLastDays(list, now, 7), 2);
    });
  });
}
