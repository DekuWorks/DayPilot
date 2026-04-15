import 'package:firebase_messaging/firebase_messaging.dart';

/// FCM wiring (task 24). Call [ensureInitialized] after `flutterfire configure`
/// and adding `firebase_options.dart` + `Firebase.initializeApp`.
class PushNotificationService {
  PushNotificationService(this._messaging);

  final FirebaseMessaging _messaging;

  /// No-op if permission denied or Firebase not configured on device.
  Future<void> requestPermissionAndListen() async {
    await _messaging.requestPermission();
    FirebaseMessaging.onMessage.listen((_) {});
  }
}
