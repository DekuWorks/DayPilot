# DayPilot Flutter (Milestone 1)

Mobile client for DayPilot. Uses **Supabase** for auth and data (see `../docs/SUPABASE_API_ALIGNMENT.md` for how this relates to the Nest API).

## Prerequisites

- Flutter stable (SDK `^3.11` per `pubspec.yaml`)
- Xcode (iOS), Android Studio / SDK (Android)
- A Supabase project with tables the app expects (`events`, `calendars`, etc.—align with your Supabase schema)

## Configuration

Secrets are **not** committed. Pass values at compile time:

```bash
cd daypilot_flutter

flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_anon_key
```

If `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing, the app shows a **configuration missing** screen instead of crashing.

### Optional: Firebase (push notifications)

After adding `firebase_options.dart` (from FlutterFire CLI), you can pass:

`FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_IOS_APP_ID`, `FIREBASE_STORAGE_BUCKET`

When all are non-empty, Firebase initializes and FCM listeners attach.

### IDE / VS Code

Add to `.vscode/launch.json` (local only, not committed with secrets):

```json
{
  "configurations": [
    {
      "name": "daypilot_flutter",
      "request": "launch",
      "type": "dart",
      "program": "lib/main.dart",
      "args": [
        "--dart-define=SUPABASE_URL=https://....supabase.co",
        "--dart-define=SUPABASE_ANON_KEY=..."
      ]
    }
  ]
}
```

## Commands

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk   # or ios, appbundle
```

## What’s next

1. Run through **`docs/FLUTTER_QA_CHECKLIST.md`** on a device.
2. Resolve **Supabase vs Nest** data alignment for production (`docs/SUPABASE_API_ALIGNMENT.md`).
3. **Internal testing**: TestFlight / Play Console (see `docs/FLUTTER_MIGRATION_TASKS.md` Phase H).
