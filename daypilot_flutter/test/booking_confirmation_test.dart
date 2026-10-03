import 'package:daypilot_flutter/data/repositories/booking_confirmation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('empty API config does not send', () async {
    final sent = await requestBookingConfirmation(
      bookingLinkId: '11111111-1111-4111-8111-111111111111',
      start: DateTime.utc(2026, 1, 5, 14),
      bookerEmail: 'ada@example.com',
      apiBaseUrl: '',
    );
    expect(sent, isFalse);
  });

  test('sent true is reported and a failed response is not', () async {
    final ok = MockClient((request) async {
      expect(request.url.path, '/bookings/confirmation');
      return http.Response('{"sent":true}', 200);
    });
    expect(
      await requestBookingConfirmation(
        bookingLinkId: '11111111-1111-4111-8111-111111111111',
        start: DateTime.utc(2026, 1, 5, 14),
        bookerEmail: 'ada@example.com',
        apiBaseUrl: 'https://api.example.com',
        client: ok,
      ),
      isTrue,
    );

    final failed = MockClient((request) async => http.Response('no', 500));
    expect(
      await requestBookingConfirmation(
        bookingLinkId: '11111111-1111-4111-8111-111111111111',
        start: DateTime.utc(2026, 1, 5, 14),
        bookerEmail: 'ada@example.com',
        apiBaseUrl: 'https://api.example.com',
        client: failed,
      ),
      isFalse,
    );
  });
}
