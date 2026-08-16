import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';

/// FCM wiring. Only request permission / register when the user opts in.
///
/// Safe to construct only after `Firebase.initializeApp`. Missing dart-defines
/// means this service is never created — local notifications still work.
class PushNotificationService {
  PushNotificationService(this._messaging);

  final FirebaseMessaging _messaging;
  StreamSubscription<RemoteMessage>? _foreground;

  Future<bool> requestPermissionAndListen() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    final granted =
        settings.authorizationStatus == AuthorizationStatus.authorized ||
            settings.authorizationStatus == AuthorizationStatus.provisional;
    if (!granted) return false;
    await listenWithoutRequesting();
    return true;
  }

  /// Resume FCM after relaunch when the user already opted in.
  /// Does not show the iOS permission dialog.
  Future<void> listenWithoutRequesting() async {
    await _messaging.setAutoInitEnabled(true);
    try {
      await _messaging.getToken();
    } catch (_) {
      // APNs / token can fail on simulator; local notifications still apply.
    }
    _foreground ??= FirebaseMessaging.onMessage.listen((_) {});
  }
}
