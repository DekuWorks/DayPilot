import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

const kDayPilotReminderChannelId = 'daypilot_reminders';
const kDayPilotBriefChannelId = 'daypilot_pilot_brief';
const kBriefNotificationBaseId = 91000;
const kEventNotificationBaseId = 92000;

/// 15 minutes before [startsAt], or null if that instant is already past.
DateTime? reminderTime({
  required DateTime startsAt,
  required DateTime now,
  Duration lead = const Duration(minutes: 15),
}) {
  final when = startsAt.subtract(lead);
  if (!when.isAfter(now)) return null;
  return when;
}

/// Next [days] local mornings at [hour]:00, skipping any already past today.
List<DateTime> nextMorningBriefs({
  required DateTime now,
  int hour = 8,
  int days = 7,
}) {
  final out = <DateTime>[];
  var day = DateTime(now.year, now.month, now.day, hour);
  if (!day.isAfter(now)) {
    day = day.add(const Duration(days: 1));
  }
  for (var i = 0; i < days; i++) {
    out.add(day.add(Duration(days: i)));
  }
  return out;
}

/// Local notifications (event reminders / Pilot Brief).
///
/// Init does **not** show the iOS permission dialog. Call [requestPermission]
/// from Settings when the user turns DayPilot notifications on.
class LocalNotificationsService {
  LocalNotificationsService({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;

  Future<void> init() async {
    tzdata.initializeTimeZones();
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _plugin.initialize(settings: settings);
    await _ensureAndroidChannels();
  }

  Future<void> _ensureAndroidChannels() async {
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;
    await android.createNotificationChannel(
      const AndroidNotificationChannel(
        kDayPilotReminderChannelId,
        'Event reminders',
        description: 'Local reminders for upcoming events',
        importance: Importance.high,
      ),
    );
    await android.createNotificationChannel(
      const AndroidNotificationChannel(
        kDayPilotBriefChannelId,
        'Pilot Brief',
        description: 'Local Pilot Brief alerts',
        importance: Importance.defaultImportance,
      ),
    );
  }

  /// iOS: `UNUserNotificationCenter` alert/badge/sound prompt.
  /// Android 13+: `POST_NOTIFICATIONS`.
  Future<bool> requestPermission() async {
    final ios = _plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    if (ios != null) {
      return await ios.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
    }
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      return await android.requestNotificationsPermission() ??
          await android.areNotificationsEnabled() ??
          true;
    }
    return true;
  }

  Future<bool> hasPermission() async {
    final ios = _plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    if (ios != null) {
      final opts = await ios.checkPermissions();
      return opts?.isEnabled == true || opts?.isProvisionalEnabled == true;
    }
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      return await android.areNotificationsEnabled() ?? false;
    }
    return false;
  }

  Future<void> cancelAllScheduled() => _plugin.cancelAll();

  /// One-shot local alerts: event reminders + morning Pilot Brief for a week.
  Future<void> reschedule({
    required List<({String id, String title, DateTime startsAt})> events,
    required DateTime now,
  }) async {
    await cancelAllScheduled();
    final details = NotificationDetails(
      android: const AndroidNotificationDetails(
        kDayPilotReminderChannelId,
        'Event reminders',
        channelDescription: 'Local reminders for upcoming events',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentSound: true,
        presentBadge: true,
      ),
    );
    final briefDetails = NotificationDetails(
      android: const AndroidNotificationDetails(
        kDayPilotBriefChannelId,
        'Pilot Brief',
        channelDescription: 'Local Pilot Brief alerts',
        importance: Importance.defaultImportance,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentSound: true,
      ),
    );

    var eventIndex = 0;
    for (final event in events) {
      final when = reminderTime(startsAt: event.startsAt, now: now);
      if (when == null) continue;
      if (eventIndex >= 20) break;
      await _plugin.zonedSchedule(
        id: kEventNotificationBaseId + eventIndex,
        scheduledDate: _toTz(when),
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        title: event.title.isEmpty ? 'Upcoming event' : event.title,
        body: 'Starts in 15 minutes',
        payload: event.id,
      );
      eventIndex += 1;
    }

    final mornings = nextMorningBriefs(now: now);
    for (var i = 0; i < mornings.length; i++) {
      await _plugin.zonedSchedule(
        id: kBriefNotificationBaseId + i,
        scheduledDate: _toTz(mornings[i]),
        notificationDetails: briefDetails,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        title: 'Pilot Brief',
        body: 'Your day is ready. Open DayPilot for today’s brief.',
      );
    }
  }

  tz.TZDateTime _toTz(DateTime local) {
    final utc = local.isUtc ? local : local.toUtc();
    return tz.TZDateTime.from(utc, tz.UTC);
  }
}
