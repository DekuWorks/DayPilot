import 'package:daypilot_flutter/features/onboarding/welcome_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Welcome screen renders primary iOS onboarding CTAs',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WelcomeScreen(),
      ),
    );

    expect(find.text('Plan. Pilot. Perform.'), findsOneWidget);
    expect(find.text('Get Started Free'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
