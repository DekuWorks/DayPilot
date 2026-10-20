import 'package:daypilot_flutter/features/founder_hub/founder_people_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('people failures stay a short line and drop the exception', () {
    const leaked =
        'Exception: Invalid `this.prisma.planWaitlistEntry.findMany()` '
        'invocation in /Users/marcusbrown/Desktop/DayPilot/apps/api/src/'
        'founder-hub/prisma-hub.db.ts:130 The column `plan_waitlist.status` '
        'does not exist';

    final load = founderPeopleErrorMessage(updating: false);
    final update = founderPeopleErrorMessage(updating: true);

    expect(load, 'Could not load people.');
    expect(update, 'Could not update that request.');
    expect(load, isNot(contains(leaked)));
    expect(load, isNot(contains('prisma')));
    expect(load, isNot(contains('/Users/')));
    expect(update, isNot(contains('plan_waitlist')));
  });
}
