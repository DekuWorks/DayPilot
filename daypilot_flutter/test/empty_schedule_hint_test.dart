import 'package:daypilot_flutter/features/calendar/empty_schedule_hint.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('empty day offers an event and an optional calendar connection', (
    tester,
  ) async {
    var added = 0;
    var connected = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmptyScheduleHint(
            title: 'No events on this day.',
            body:
                'Add an event, or connect a calendar when you want this day to include commitments you already have.',
            primaryLabel: 'New event',
            onPrimary: () => added++,
            secondaryLabel: 'Connect a calendar',
            onSecondary: () => connected++,
          ),
        ),
      ),
    );

    expect(find.text('No events on this day.'), findsOneWidget);
    await tester.tap(find.text('New event'));
    await tester.tap(find.text('Connect a calendar'));
    expect(added, 1);
    expect(connected, 1);
  });

  testWidgets('dismiss stays optional', (tester) async {
    var dismissed = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmptyScheduleHint(
            title: 'Nothing in the next two days.',
            body: 'You can skip this.',
            primaryLabel: 'Add a task',
            onPrimary: () {},
            secondaryLabel: 'Connect a calendar',
            onSecondary: () {},
            dismissLabel: 'Not now',
            onDismiss: () => dismissed++,
          ),
        ),
      ),
    );

    await tester.tap(find.text('Not now'));
    expect(dismissed, 1);
  });
}
