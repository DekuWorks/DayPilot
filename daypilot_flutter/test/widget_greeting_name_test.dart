import 'package:daypilot_flutter/data/services/widget_snapshot_writer.dart';
import 'package:daypilot_flutter/features/profile/profile_providers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('profileGreetingFirstName', () {
    test('prefers profiles.first_name like the web header', () {
      expect(
        profileGreetingFirstName({
          'first_name': 'Marcus',
          'display_name': 'Marcus Brown',
          'email': 'dekuworks1@example.com',
        }),
        'Marcus',
      );
    });

    test('uses first token of display_name when first_name is missing', () {
      expect(
        profileGreetingFirstName({
          'display_name': 'Marcus Brown',
          'email': 'dekuworks1@example.com',
        }),
        'Marcus',
      );
    });

    test('falls back to metadata first_name, never the email local-part', () {
      expect(
        profileGreetingFirstName(
          {'email': 'dekuworks1@example.com'},
          {'first_name': 'Marcus', 'full_name': 'Marcus Brown'},
        ),
        'Marcus',
      );
      expect(
        profileGreetingFirstName(
          {'email': 'dekuworks1@example.com'},
          {'full_name': 'Marcus Brown'},
        ),
        'Marcus',
      );
      expect(
        profileGreetingFirstName({'email': 'dekuworks1@example.com'}),
        'there',
      );
    });

    test('rejects a raw email stored in a name field', () {
      expect(
        profileGreetingFirstName({'display_name': 'dekuworks1@example.com'}),
        'there',
      );
    });
  });

  group('WidgetSnapshotWriter.greetingDisplayName', () {
    test('keeps a real first name', () {
      expect(WidgetSnapshotWriter.greetingDisplayName('Marcus Brown'), 'Marcus');
    });

    test('never writes an email username', () {
      expect(
        WidgetSnapshotWriter.greetingDisplayName('dekuworks1@example.com'),
        'there',
      );
      expect(WidgetSnapshotWriter.greetingDisplayName(''), 'there');
    });
  });
}
