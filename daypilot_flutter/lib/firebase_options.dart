import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import 'core/config/daypilot_env.dart';

/// Built from `--dart-define` values (same keys as [DayPilotEnv] Firebase fields).
/// Add `android/app/google-services.json` from the Firebase console for Android FCM.
abstract final class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Web Firebase is not configured for DayPilot mobile.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static FirebaseOptions get android => FirebaseOptions(
        apiKey: DayPilotEnv.firebaseApiKey,
        appId: DayPilotEnv.firebaseAndroidAppId,
        messagingSenderId: DayPilotEnv.firebaseMessagingSenderId,
        projectId: DayPilotEnv.firebaseProjectId,
        storageBucket: DayPilotEnv.firebaseStorageBucket.isEmpty
            ? '${DayPilotEnv.firebaseProjectId}.appspot.com'
            : DayPilotEnv.firebaseStorageBucket,
      );

  static FirebaseOptions get ios => FirebaseOptions(
        apiKey: DayPilotEnv.firebaseApiKey,
        appId: DayPilotEnv.firebaseIosAppId,
        messagingSenderId: DayPilotEnv.firebaseMessagingSenderId,
        projectId: DayPilotEnv.firebaseProjectId,
        storageBucket: DayPilotEnv.firebaseStorageBucket.isEmpty
            ? '${DayPilotEnv.firebaseProjectId}.appspot.com'
            : DayPilotEnv.firebaseStorageBucket,
        iosBundleId: 'com.daypilot.daypilot',
      );
}
