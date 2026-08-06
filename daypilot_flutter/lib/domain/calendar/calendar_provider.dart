enum DayPilotCalendarProvider {
  daypilot,
  google,
  microsoft,
  appleEventkit,
  localDevice,
}

enum CalendarSourceClass {
  icloud,
  google,
  exchange,
  subscribed,
  birthdays,
  local,
  unknown,
}

class CalendarProviderCapabilities {
  const CalendarProviderCapabilities({
    required this.readEvents,
    required this.createEvents,
    required this.updateEvents,
    required this.deleteEvents,
    required this.serverSideSync,
    required this.backgroundSync,
    required this.requiresDevice,
  });

  final bool readEvents;
  final bool createEvents;
  final bool updateEvents;
  final bool deleteEvents;
  final bool serverSideSync;
  final bool backgroundSync;
  final bool requiresDevice;
}

const appleEventKitCapabilities = CalendarProviderCapabilities(
  readEvents: true,
  createEvents: true,
  updateEvents: true,
  deleteEvents: true,
  serverSideSync: false,
  backgroundSync: false,
  requiresDevice: true,
);

CalendarSourceClass classifyDeviceCalendarSource({
  String? title,
  String? sourceName,
  String? accountType,
  String? calendarType,
}) {
  final blob = [
    title,
    sourceName,
    accountType,
    calendarType,
  ].whereType<String>().join(' ').toLowerCase();

  if (blob.contains('birthday')) return CalendarSourceClass.birthdays;
  if (blob.contains('holiday') ||
      blob.contains('subscribed') ||
      blob.contains('subscription')) {
    return CalendarSourceClass.subscribed;
  }
  if (blob.contains('google') || blob.contains('gmail')) {
    return CalendarSourceClass.google;
  }
  if (blob.contains('exchange') ||
      blob.contains('outlook') ||
      blob.contains('office365') ||
      blob.contains('microsoft')) {
    return CalendarSourceClass.exchange;
  }
  if (blob.contains('icloud') ||
      blob.contains('caldav') ||
      blob.contains('apple')) {
    return CalendarSourceClass.icloud;
  }
  if (blob.contains('local')) return CalendarSourceClass.local;
  return CalendarSourceClass.unknown;
}

String sourceClassLabel(CalendarSourceClass c) {
  switch (c) {
    case CalendarSourceClass.icloud:
      return 'iCloud';
    case CalendarSourceClass.google:
      return 'Google';
    case CalendarSourceClass.exchange:
      return 'Exchange / Outlook';
    case CalendarSourceClass.subscribed:
      return 'Subscribed';
    case CalendarSourceClass.birthdays:
      return 'Birthdays';
    case CalendarSourceClass.local:
      return 'Local';
    case CalendarSourceClass.unknown:
      return 'Other';
  }
}
