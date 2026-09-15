import 'package:flutter_test/flutter_test.dart';

import 'package:daypilot_flutter/data/repositories/auth_repository.dart';

void main() {
  test('OAuth callback scheme stays in-app (not system Safari handoff)', () {
    expect(kAuthCallbackScheme, 'com.daypilot.daypilot');
    expect(kAuthCallbackRedirect, startsWith('$kAuthCallbackScheme://'));
    expect(kAuthCallbackRedirect, contains('login-callback'));
  });
}
