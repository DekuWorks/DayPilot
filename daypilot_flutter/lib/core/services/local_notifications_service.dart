import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Local notification bootstrap (task 24). Wire channels to reminders in a later task.
class LocalNotificationsService {
  LocalNotificationsService();

  final _plugin = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await _plugin.initialize(settings: settings);
  }
}
