import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/config/daypilot_env.dart';
import 'core/providers/bootstrap_providers.dart';
import 'core/providers/notification_preference_provider.dart';
import 'core/services/local_notifications_service.dart';
import 'core/services/push_notification_service.dart';
import 'firebase_options.dart';
import 'missing_config_app.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  if (!DayPilotEnv.hasSupabase) {
    runApp(const MissingSupabaseConfigApp());
    return;
  }

  await Supabase.initialize(
    url: DayPilotEnv.supabaseUrl,
    anonKey: DayPilotEnv.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  final localNotifications = LocalNotificationsService();
  await localNotifications.init();

  PushNotificationService? push;
  if (DayPilotEnv.hasFirebase) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    push = PushNotificationService(FirebaseMessaging.instance);
    final optedIn = prefs.getBool(kNotificationsEnabledPrefsKey) ?? false;
    if (optedIn && await localNotifications.hasPermission()) {
      await push.listenWithoutRequesting();
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        localNotificationsServiceProvider.overrideWithValue(localNotifications),
        pushNotificationServiceProvider.overrideWithValue(push),
      ],
      child: const DayPilotApp(),
    ),
  );
}
