import 'package:daypilot_flutter/data/services/apple_calendar_service.dart';
import 'package:device_calendar/device_calendar.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const calendarId = 'cal-icloud';
  final startMs = DateTime.utc(2026, 8, 15, 14).millisecondsSinceEpoch;
  final endMs = DateTime.utc(2026, 8, 15, 15).millisecondsSinceEpoch;

  test('null availability parses into a payload', () {
    final payload = deviceEventPayloadFromPluginJson(
      {
        'eventId': 'evt-1',
        'calendarId': calendarId,
        'title': 'US Holidays',
        'start': startMs,
        'end': endMs,
        'availability': null,
        'location': null,
        'description': null,
      },
      fallbackCalendarId: calendarId,
    );

    expect(payload, isNotNull);
    expect(payload!.externalEventId, 'evt-1');
    expect(payload.title, 'US Holidays');
    expect(payload.startsAt.millisecondsSinceEpoch, startMs);
    expect(payload.endsAt.millisecondsSinceEpoch, endMs);
    expect(payload.location, isNull);
    expect(payload.description, isNull);
  });

  test('null or blank title becomes (No title)', () {
    final missingTitle = deviceEventPayloadFromPluginJson(
      {
        'eventId': 'evt-2',
        'start': startMs,
        'title': null,
      },
      fallbackCalendarId: calendarId,
    );
    final blankTitle = deviceEventPayloadFromPluginJson(
      {
        'eventId': 'evt-3',
        'start': startMs,
        'title': '   ',
      },
      fallbackCalendarId: calendarId,
    );

    expect(missingTitle?.title, '(No title)');
    expect(blankTitle?.title, '(No title)');
  });

  test('events missing eventId or start are skipped', () {
    expect(
      deviceEventPayloadFromPluginJson(
        {'title': 'No id', 'start': startMs},
        fallbackCalendarId: calendarId,
      ),
      isNull,
    );
    expect(
      deviceEventPayloadFromPluginJson(
        {'eventId': 'evt-4', 'title': 'No start'},
        fallbackCalendarId: calendarId,
      ),
      isNull,
    );
    expect(
      deviceEventPayloadFromPluginJson(
        {'eventId': '', 'title': 'Empty id', 'start': startMs},
        fallbackCalendarId: calendarId,
      ),
      isNull,
    );
  });

  test(
    'device_calendar Event.fromJson throws TypeError when availability is null',
    () {
      expect(
        () => Event.fromJson({
          'eventId': 'evt-plugin',
          'calendarId': calendarId,
          'title': 'Birthday',
          'start': startMs,
          'end': endMs,
          'availability': null,
        }),
        throwsA(isA<TypeError>()),
      );
    },
  );
}
