import 'package:flutter_test/flutter_test.dart';

import 'package:daypilot_flutter/missing_config_app.dart';

/// Lightweight QA smoke checks (task 29) — no Supabase or device required.
void main() {
  testWidgets('Missing Supabase config screen', (tester) async {
    await tester.pumpWidget(const MissingSupabaseConfigApp());
    await tester.pumpAndSettle();
    expect(find.textContaining('Supabase'), findsWidgets);
  });
}
