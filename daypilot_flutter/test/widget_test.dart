import 'package:flutter_test/flutter_test.dart';

import 'package:daypilot_flutter/missing_config_app.dart';

void main() {
  testWidgets('Missing config app renders', (WidgetTester tester) async {
    await tester.pumpWidget(const MissingSupabaseConfigApp());
    expect(find.textContaining('Supabase'), findsWidgets);
  });
}
