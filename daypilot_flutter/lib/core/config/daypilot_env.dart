/// Compile-time configuration. Pass values with:
/// `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`
/// Option C: `--dart-define=DAYPILOT_API_URL=https://api.example.com` (no trailing slash).
abstract final class DayPilotEnv {
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  /// Nest API base URL (events/calendar). When set, mobile uses Option C hybrid.
  static const String daypilotApiUrl =
      String.fromEnvironment('DAYPILOT_API_URL', defaultValue: '');

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static bool get hasDaypilotApi => daypilotApiUrl.isNotEmpty;

  /// Optional Firebase (FCM). When all are non-empty, [Firebase.initializeApp] runs.
  static const String firebaseProjectId =
      String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: '');
  static const String firebaseApiKey =
      String.fromEnvironment('FIREBASE_API_KEY', defaultValue: '');
  static const String firebaseMessagingSenderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID', defaultValue: '');
  static const String firebaseAndroidAppId =
      String.fromEnvironment('FIREBASE_ANDROID_APP_ID', defaultValue: '');
  static const String firebaseIosAppId =
      String.fromEnvironment('FIREBASE_IOS_APP_ID', defaultValue: '');
  static const String firebaseStorageBucket =
      String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: '');

  static bool get hasFirebase =>
      firebaseProjectId.isNotEmpty &&
      firebaseApiKey.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseAndroidAppId.isNotEmpty &&
      firebaseIosAppId.isNotEmpty;
}
