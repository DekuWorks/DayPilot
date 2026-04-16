# DayPilot Flutter (Milestone 1)

Mobile client for DayPilot. **Option C:** Supabase auth + Nest API for events — see **`../docs/OPTION_C_SETUP.md`** (full walkthrough) and **`../docs/SUPABASE_API_ALIGNMENT.md`** (architecture).

After sign-in, the app opens a **single dashboard** (`/dashboard`) with the **cream + teal** DayPilot theme (aligned with the Next.js marketing site) and the calendar as the main surface. **Insights** is available from the header icon (not a separate tab bar). Old **`/calendar`** URLs redirect to **`/dashboard`**.

## Prerequisites

- Flutter stable (SDK `^3.11` per `pubspec.yaml`)
- Xcode (iOS), Android Studio / SDK (Android)
- A Supabase project with tables the app expects (`events`, `calendars`, etc.—align with your Supabase schema)

## Configuration

Secrets are **not** committed. Recommended **local workflow**:

1. **One-time:** copy the example define file and fill in real values:

   ```bash
   cd daypilot_flutter
   cp dart-define.example.json dart-define.json
   # Edit dart-define.json: SUPABASE_URL, SUPABASE_ANON_KEY (anon or publishable), DAYPILOT_API_URL
   ```

   `dart-define.json` is **gitignored**. Use **`http://localhost:3001`** for iOS Simulator / Chrome; **`http://10.0.2.2:3001`** for Android emulator; your LAN IP for a physical device.

2. **Run** from the repo root:

   ```bash
   pnpm flutter:run          # default device
   pnpm flutter:run:web      # Chrome
   ```

   Or from `daypilot_flutter`: `./run.sh -d chrome`

   This uses Flutter’s **`--dart-define-from-file=dart-define.json`** so you do not paste long `--dart-define` lines each time.

**Manual:** you can still pass defines inline:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_anon_key \
  --dart-define=DAYPILOT_API_URL=https://your-api.example.com
```

The API must expose `POST /auth/supabase-exchange` and have **`SUPABASE_URL`** (or legacy **`SUPABASE_JWT_SECRET`**) set on the server (see `docs/SUPABASE_API_ALIGNMENT.md`). Omit `DAYPILOT_API_URL` only if you use legacy Supabase-only events.

If `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing, the app shows a **configuration missing** screen instead of crashing.

### Optional: Firebase (push notifications)

After adding `firebase_options.dart` (from FlutterFire CLI), you can pass:

`FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_IOS_APP_ID`, `FIREBASE_STORAGE_BUCKET`

When all are non-empty, Firebase initializes and FCM listeners attach.

### IDE / VS Code

Prefer **`--dart-define-from-file`** so secrets stay in local `dart-define.json` (gitignored):

```json
{
  "configurations": [
    {
      "name": "daypilot_flutter",
      "request": "launch",
      "type": "dart",
      "program": "lib/main.dart",
      "args": [
        "--dart-define-from-file=dart-define.json"
      ],
      "cwd": "${workspaceFolder}/daypilot_flutter"
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
