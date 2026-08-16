import 'package:daypilot_flutter/data/services/suggest_schedule_api.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses Nest suggest-schedule payload', () {
    final slots = parseSuggestedEvents({
      'suggestions': [
        {
          'title': 'Deep work',
          'start': '2026-08-16T13:00:00.000Z',
          'end': '2026-08-16T15:00:00.000Z',
          'description': 'Focus time',
        },
      ],
    });
    expect(slots, hasLength(1));
    expect(slots.first.title, 'Deep work');
    expect(slots.first.description, 'Focus time');
    expect(slots.first.start.isUtc, isTrue);
  });

  test('empty or malformed payload is empty', () {
    expect(parseSuggestedEvents(null), isEmpty);
    expect(parseSuggestedEvents({'suggestions': 'nope'}), isEmpty);
    expect(parseSuggestedEvents({'suggestions': []}), isEmpty);
  });
}
