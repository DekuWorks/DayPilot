import 'dart:convert';
import 'dart:io';

import 'package:device_calendar/device_calendar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../domain/calendar/calendar_provider.dart';
import 'device_install_id_service.dart';

/// Maps a `device_calendar` retrieveEvents JSON row without [Event.fromJson].
///
/// The plugin's parser requires `availability` to be a non-null [String].
/// EventKit often sends `null` (Birthdays, holidays, subscribed calendars),
/// which throws `type 'Null' is not a subtype of type 'String'`.
@visibleForTesting
DeviceEventPayload? deviceEventPayloadFromPluginJson(
  Map<String, dynamic> json, {
  required String fallbackCalendarId,
}) {
  final eventId = json['eventId']?.toString();
  if (eventId == null || eventId.isEmpty) return null;

  final startMs = json['start'];
  if (startMs is! num) return null;
  final eventStart = DateTime.fromMillisecondsSinceEpoch(startMs.toInt());

  final endMs = json['end'];
  final eventEnd = endMs is num
      ? DateTime.fromMillisecondsSinceEpoch(endMs.toInt())
      : eventStart;

  final rawTitle = (json['title']?.toString() ?? '').trim();
  final calendarId = json['calendarId']?.toString();

  return DeviceEventPayload(
    externalEventId: eventId,
    externalCalendarId:
        (calendarId == null || calendarId.isEmpty)
            ? fallbackCalendarId
            : calendarId,
    title: rawTitle.isEmpty ? '(No title)' : rawTitle,
    startsAt: eventStart,
    endsAt: eventEnd.isBefore(eventStart) ? eventStart : eventEnd,
    description: json['description']?.toString(),
    location: json['location']?.toString(),
    allDay: json['allDay'] == true,
  );
}

enum CalendarPermissionState {
  undetermined,
  granted,
  denied,
  restricted,
  unavailable,
}

class DiscoveredDeviceCalendar {
  DiscoveredDeviceCalendar({
    required this.id,
    required this.title,
    required this.sourceClass,
    required this.isReadOnly,
    required this.isPrimary,
    this.accountName,
    this.accountType,
    this.color,
    this.isSelected = true,
    this.duplicatePrevented = false,
    this.duplicateReason,
  });

  final String id;
  final String title;
  final CalendarSourceClass sourceClass;
  final bool isReadOnly;
  final bool isPrimary;
  final String? accountName;
  final String? accountType;
  final int? color;
  bool isSelected;
  bool duplicatePrevented;
  String? duplicateReason;

  Map<String, dynamic> toApiJson() => {
        'externalCalendarId': id,
        'title': title,
        'calendarType': sourceClass.name,
        'sourceName': accountName ?? accountType,
        if (color != null)
          'color': '#${color!.toRadixString(16).padLeft(8, '0').substring(2)}',
        'isPrimary': isPrimary,
        'isReadOnly': isReadOnly,
        'isSelected': isSelected && !duplicatePrevented,
        'isVisible': true,
      };
}

class DeviceEventPayload {
  const DeviceEventPayload({
    required this.externalEventId,
    required this.externalCalendarId,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.description,
    this.location,
    this.allDay = false,
  });

  final String externalEventId;
  final String externalCalendarId;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? description;
  final String? location;
  final bool allDay;

  Map<String, dynamic> toApiJson() => {
        'externalEventId': externalEventId,
        'externalCalendarId': externalCalendarId,
        'title': title,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
        if (description != null && description!.isNotEmpty)
          'description': description,
        if (location != null && location!.isNotEmpty) 'location': location,
        'allDay': allDay,
      };
}

/// EventKit bridge for DayPilot (Flutter `device_calendar`, not Expo).
class AppleCalendarService {
  AppleCalendarService({
    DeviceCalendarPlugin? plugin,
    DeviceInstallIdService? installId,
  })  : _plugin = plugin ?? DeviceCalendarPlugin(),
        _installId = installId ?? DeviceInstallIdService();

  final DeviceCalendarPlugin _plugin;
  final DeviceInstallIdService _installId;
  bool _permissionDeniedPermanently = false;

  static bool get isSupported =>
      !kIsWeb && (Platform.isIOS || Platform.isAndroid);

  Future<String> deviceId() => _installId.getDeviceId();

  Future<CalendarPermissionState> getCalendarPermissionStatus() async {
    if (!isSupported) return CalendarPermissionState.unavailable;
    try {
      final existing = await _plugin.hasPermissions();
      if (existing.isSuccess && existing.data == true) {
        return CalendarPermissionState.granted;
      }
      if (_permissionDeniedPermanently) {
        return CalendarPermissionState.denied;
      }
      return CalendarPermissionState.undetermined;
    } catch (_) {
      return CalendarPermissionState.unavailable;
    }
  }

  Future<CalendarPermissionState> requestCalendarPermission() async {
    if (!isSupported) return CalendarPermissionState.unavailable;
    final status = await getCalendarPermissionStatus();
    if (status == CalendarPermissionState.granted) return status;
    if (status == CalendarPermissionState.denied) return status;

    final requested = await _plugin.requestPermissions();
    if (requested.isSuccess && requested.data == true) {
      _permissionDeniedPermanently = false;
      return CalendarPermissionState.granted;
    }
    _permissionDeniedPermanently = true;
    return CalendarPermissionState.denied;
  }

  Future<void> openSystemSettings() async {
    final uri = Platform.isIOS
        ? Uri.parse('app-settings:')
        : Uri.parse('package:com.dekuworks.daypilot');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<List<DiscoveredDeviceCalendar>> getAvailableDeviceCalendars({
    bool hasGoogleConnection = false,
    bool hasMicrosoftConnection = false,
  }) async {
    final permission = await requestCalendarPermission();
    if (permission != CalendarPermissionState.granted) {
      throw Exception(_permissionMessage(permission));
    }

    final result = await _plugin.retrieveCalendars();
    if (!result.isSuccess || result.data == null) {
      throw Exception(
        result.errors.isNotEmpty
            ? result.errors.first.errorMessage
            : 'Could not read device calendars.',
      );
    }

    return result.data!.where((c) => c.id != null).map((c) {
      final sourceClass = classifyDeviceCalendarSource(
        title: c.name,
        sourceName: c.accountName,
        accountType: c.accountType,
      );
      final duplicate = _detectDuplicate(
        sourceClass,
        hasGoogleConnection: hasGoogleConnection,
        hasMicrosoftConnection: hasMicrosoftConnection,
      );
      return DiscoveredDeviceCalendar(
        id: c.id!,
        title: (c.name ?? 'Calendar').trim().isEmpty
            ? 'Calendar'
            : c.name!.trim(),
        sourceClass: sourceClass,
        isReadOnly: c.isReadOnly ?? false,
        isPrimary: c.isDefault ?? false,
        accountName: c.accountName,
        accountType: c.accountType,
        color: c.color,
        isSelected: !duplicate.$1,
        duplicatePrevented: duplicate.$1,
        duplicateReason: duplicate.$2,
      );
    }).toList();
  }

  (bool, String?) _detectDuplicate(
    CalendarSourceClass sourceClass, {
    required bool hasGoogleConnection,
    required bool hasMicrosoftConnection,
  }) {
    if (sourceClass == CalendarSourceClass.google && hasGoogleConnection) {
      return (
        true,
        'Google is already connected directly to DayPilot. '
            'This device calendar will not be imported.',
      );
    }
    if (sourceClass == CalendarSourceClass.exchange &&
        hasMicrosoftConnection) {
      return (
        true,
        'Outlook is already connected directly to DayPilot. '
            'This device calendar will not be imported.',
      );
    }
    return (false, null);
  }

  Future<List<DeviceEventPayload>> getSelectedCalendarEvents({
    required Iterable<String> calendarIds,
    DateTime? start,
    DateTime? end,
  }) async {
    final now = DateTime.now();
    final rangeStart = start ?? now.subtract(const Duration(days: 90));
    final rangeEnd = end ?? now.add(const Duration(days: 365));
    final payloads = <DeviceEventPayload>[];
    final seen = <String>{};

    Object? lastError;
    var calendarCount = 0;
    var failedCalendars = 0;
    for (final calendarId in calendarIds) {
      calendarCount++;
      try {
        final maps = await _retrieveEventMaps(calendarId, rangeStart, rangeEnd);
        for (final map in maps) {
          final payload = deviceEventPayloadFromPluginJson(
            map,
            fallbackCalendarId: calendarId,
          );
          if (payload == null) continue;
          final key =
              '${payload.externalCalendarId}:${payload.externalEventId}';
          if (!seen.add(key)) continue;
          payloads.add(payload);
        }
      } catch (e) {
        lastError = e;
        failedCalendars++;
      }
    }
    if (calendarCount > 0 &&
        failedCalendars == calendarCount &&
        lastError != null) {
      throw lastError;
    }
    return payloads;
  }

  Future<List<Map<String, dynamic>>> _retrieveEventMaps(
    String calendarId,
    DateTime start,
    DateTime end,
  ) async {
    final raw = await DeviceCalendarPlugin.channel.invokeMethod<dynamic>(
      'retrieveEvents',
      {
        'calendarId': calendarId,
        'startDate': start.millisecondsSinceEpoch,
        'endDate': end.millisecondsSinceEpoch,
      },
    );
    final decoded = raw is String ? json.decode(raw) : raw;
    if (decoded is! List) return [];
    return [
      for (final item in decoded)
        if (item is Map) Map<String, dynamic>.from(item),
    ];
  }

  Future<String> createAppleCalendarEvent({
    required String calendarId,
    required String title,
    required DateTime start,
    required DateTime end,
    String? description,
    String? location,
    bool allDay = false,
  }) async {
    final event = Event(
      calendarId,
      title: title,
      start: start,
      end: end,
      description: description,
      allDay: allDay,
    )..location = location;
    final result = await _plugin.createOrUpdateEvent(event);
    if (result == null ||
        !result.isSuccess ||
        result.data == null ||
        result.data!.isEmpty) {
      throw Exception(
        (result?.errors.isNotEmpty ?? false)
            ? result!.errors.first.errorMessage
            : 'Could not create calendar event.',
      );
    }
    return result.data!;
  }

  Future<void> updateAppleCalendarEvent({
    required String calendarId,
    required String eventId,
    required String title,
    required DateTime start,
    required DateTime end,
    String? description,
    String? location,
    bool allDay = false,
  }) async {
    final event = Event(
      calendarId,
      eventId: eventId,
      title: title,
      start: start,
      end: end,
      description: description,
      allDay: allDay,
    )..location = location;
    final result = await _plugin.createOrUpdateEvent(event);
    if (result == null || !result.isSuccess) {
      throw Exception(
        (result?.errors.isNotEmpty ?? false)
            ? result!.errors.first.errorMessage
            : 'Could not update calendar event.',
      );
    }
  }

  Future<void> deleteAppleCalendarEvent({
    required String calendarId,
    required String eventId,
  }) async {
    final result = await _plugin.deleteEvent(calendarId, eventId);
    if (!result.isSuccess) {
      throw Exception(
        result.errors.isNotEmpty
            ? result.errors.first.errorMessage
            : 'Could not delete calendar event.',
      );
    }
  }

  String _permissionMessage(CalendarPermissionState state) {
    switch (state) {
      case CalendarPermissionState.denied:
        return 'Calendar access was denied. Enable Calendars for DayPilot in Settings.';
      case CalendarPermissionState.restricted:
        return 'Calendar access is restricted on this device.';
      case CalendarPermissionState.unavailable:
        return 'Device calendars are unavailable.';
      case CalendarPermissionState.undetermined:
      case CalendarPermissionState.granted:
        return 'Calendar permission is required.';
    }
  }
}
