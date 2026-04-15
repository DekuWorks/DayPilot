/// Compile-time configuration. Pass values with:
/// `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`
abstract final class DayPilotEnv {
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

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
