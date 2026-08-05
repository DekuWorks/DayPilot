import 'dart:io';

import 'package:device_calendar/device_calendar.dart';
import 'package:flutter/foundation.dart';

/// One event payload ready for Nest `/calendar-connections/apple/device-import`.
class DeviceCalendarEventPayload {
  const DeviceCalendarEventPayload({
    required this.externalId,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.description,
    this.location,
    this.allDay = false,
  });

  final String externalId;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? description;
  final String? location;
  final bool allDay;

  Map<String, dynamic> toJson() => {
        'externalId': externalId,
        'title': title,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
        if (description != null && description!.isNotEmpty)
          'description': description,
        if (location != null && location!.isNotEmpty) 'location': location,
        'allDay': allDay,
      };
}

/// Reads on-device calendars via EventKit (iOS) / Android Calendar Provider.
class DeviceCalendarImportService {
  DeviceCalendarImportService({DeviceCalendarPlugin? plugin})
      : _plugin = plugin ?? DeviceCalendarPlugin();

  final DeviceCalendarPlugin _plugin;

  static bool get isSupported =>
      !kIsWeb && (Platform.isIOS || Platform.isAndroid);

  Future<bool> requestPermission() async {
    final existing = await _plugin.hasPermissions();
    if (existing.isSuccess && existing.data == true) return true;
    final requested = await _plugin.requestPermissions();
    return requested.isSuccess && requested.data == true;
  }

  /// Loads events from writable + read-only calendars in [start, end].
  Future<List<DeviceCalendarEventPayload>> loadEvents({
    DateTime? start,
    DateTime? end,
  }) async {
    final permitted = await requestPermission();
    if (!permitted) {
      throw Exception(
        'Calendar permission denied. Enable Calendars for DayPilot in Settings.',
      );
    }

    final calendarsResult = await _plugin.retrieveCalendars();
    if (!calendarsResult.isSuccess || calendarsResult.data == null) {
      throw Exception(
        calendarsResult.errors.isNotEmpty
            ? calendarsResult.errors.first.errorMessage
            : 'Could not read device calendars.',
      );
    }

    final now = DateTime.now();
    final rangeStart = start ?? now.subtract(const Duration(days: 7));
    final rangeEnd = end ?? now.add(const Duration(days: 60));
    final payloads = <DeviceCalendarEventPayload>[];
    final seen = <String>{};

    for (final calendar in calendarsResult.data!) {
      final calendarId = calendar.id;
      if (calendarId == null || calendarId.isEmpty) continue;

      final eventsResult = await _plugin.retrieveEvents(
        calendarId,
        RetrieveEventsParams(startDate: rangeStart, endDate: rangeEnd),
      );
      if (!eventsResult.isSuccess || eventsResult.data == null) continue;

      for (final event in eventsResult.data!) {
        final eventId = event.eventId;
        final eventStart = event.start;
        final eventEnd = event.end ?? eventStart;
        if (eventId == null || eventStart == null || eventEnd == null) continue;

        final externalId = '$calendarId:$eventId';
        if (!seen.add(externalId)) continue;

        final title = (event.title ?? '').trim();
        payloads.add(
          DeviceCalendarEventPayload(
            externalId: externalId,
            title: title.isEmpty ? '(No title)' : title,
            startsAt: eventStart,
            endsAt: eventEnd.isBefore(eventStart) ? eventStart : eventEnd,
            description: event.description,
            location: event.location,
            allDay: event.allDay ?? false,
          ),
        );
      }
    }

    return payloads;
  }
}
