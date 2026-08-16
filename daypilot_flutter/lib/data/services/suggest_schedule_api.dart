import 'dart:convert';

import '../../core/config/nest_api_session.dart';

class SuggestedEvent {
  const SuggestedEvent({
    required this.title,
    required this.start,
    required this.end,
    this.description,
  });

  final String title;
  final DateTime start;
  final DateTime end;
  final String? description;

  factory SuggestedEvent.fromJson(Map<String, dynamic> json) {
    return SuggestedEvent(
      title: '${json['title'] ?? ''}',
      start: DateTime.parse('${json['start']}'),
      end: DateTime.parse('${json['end']}'),
      description: json['description']?.toString(),
    );
  }
}

List<SuggestedEvent> parseSuggestedEvents(Object? raw) {
  if (raw is! Map) return const [];
  final arr = raw['suggestions'];
  if (arr is! List) return const [];
  return arr
      .whereType<Map>()
      .map((e) => SuggestedEvent.fromJson(Map<String, dynamic>.from(e)))
      .where((e) => e.title.isNotEmpty)
      .toList();
}

/// Nest `POST /ai/suggest-schedule`. OpenAI keys stay on the server.
Future<List<SuggestedEvent>> suggestSchedule({
  required NestApiSession session,
  required String prompt,
}) async {
  final res = await session.post('/ai/suggest-schedule', body: {'prompt': prompt});
  final payload = jsonDecode(res.body.isEmpty ? '{}' : res.body);
  if (res.statusCode >= 400) {
    final message = payload is Map ? payload['message'] : null;
    if (message is List && message.isNotEmpty) {
      throw Exception(message.map((e) => '$e').join(', '));
    }
    throw Exception(message ?? 'Could not get schedule suggestions');
  }
  return parseSuggestedEvents(payload);
}
