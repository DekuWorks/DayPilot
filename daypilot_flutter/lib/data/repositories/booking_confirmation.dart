import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/daypilot_env.dart';

/// Asks the API to email the address stored on a confirmed booking.
/// A missing API or a failed send does not undo the booking.
Future<bool> requestBookingConfirmation({
  required String bookingLinkId,
  required DateTime start,
  required String bookerEmail,
  String? apiBaseUrl,
  http.Client? client,
}) async {
  final base = (apiBaseUrl ?? DayPilotEnv.daypilotApiUrl).trim().replaceAll(
    RegExp(r'/$'),
    '',
  );
  if (base.isEmpty) return false;
  final httpClient = client ?? http.Client();
  final closeClient = client == null;
  try {
    final response = await httpClient.post(
      Uri.parse('$base/bookings/confirmation'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'bookingLinkId': bookingLinkId,
        'start': start.toUtc().toIso8601String(),
        'bookerEmail': bookerEmail.trim(),
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) return false;
    final body = jsonDecode(response.body);
    return body is Map && body['sent'] == true;
  } catch (_) {
    return false;
  } finally {
    if (closeClient) httpClient.close();
  }
}
