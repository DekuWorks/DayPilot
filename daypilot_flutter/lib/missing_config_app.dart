import 'package:flutter/material.dart';

import 'core/config/daypilot_env.dart';

/// Shown when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are not provided at compile time.
class MissingSupabaseConfigApp extends StatelessWidget {
  const MissingSupabaseConfigApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DayPilot',
      home: Scaffold(
        appBar: AppBar(title: const Text('DayPilot')),
        body: const Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Supabase is not configured.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              SizedBox(height: 16),
              Text(
                'Run with dart-define values, for example:',
              ),
              SizedBox(height: 8),
              SelectableText(
                'flutter run '
                '--dart-define=SUPABASE_URL=https://YOUR_REF.supabase.co '
                '--dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY',
              ),
              SizedBox(height: 16),
              Text('Detected URL length: ${DayPilotEnv.supabaseUrl.length}'),
              SizedBox(height: 24),
              Text(
                'Optional Firebase (FCM) — add all dart-defines or leave unset:',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              SizedBox(height: 8),
              SelectableText(
                '--dart-define=FIREBASE_PROJECT_ID=... '
                '--dart-define=FIREBASE_API_KEY=... '
                '--dart-define=FIREBASE_MESSAGING_SENDER_ID=... '
                '--dart-define=FIREBASE_ANDROID_APP_ID=... '
                '--dart-define=FIREBASE_IOS_APP_ID=... '
                '--dart-define=FIREBASE_STORAGE_BUCKET=optional',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
