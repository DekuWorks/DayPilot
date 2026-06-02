import 'dart:convert';

import '../../core/config/nest_api_session.dart';

typedef CalendarProvider = String; // google | outlook | apple

class CalendarConnection {
  const CalendarConnection({
    required this.id,
    required this.provider,
    required this.email,
    this.syncedAt,
    required this.connectedAt,
  });

  final String id;
  final CalendarProvider provider;
  final String email;
  final DateTime? syncedAt;
  final DateTime connectedAt;

  factory CalendarConnection.fromJson(Map<String, dynamic> json) {
    DateTime? parse(String key) {
      final v = json[key];
      if (v == null) return null;
      return DateTime.parse(v.toString());
    }

    return CalendarConnection(
      id: json['id'].toString(),
      provider: json['provider'] as String? ?? 'google',
      email: json['email'] as String? ?? '',
      syncedAt: parse('syncedAt'),
      connectedAt: parse('connectedAt') ?? DateTime.now(),
    );
  }
}

/// Nest `/calendar-connections` — Google, Outlook, Apple OAuth.
class CalendarConnectionsRepository {
  CalendarConnectionsRepository(this._session);

  final NestApiSession _session;

  Future<List<CalendarConnection>> listConnections() async {
    final res = await _session.get('/calendar-connections');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to load connections'));
    }
    final list = jsonDecode(res.body) as List<dynamic>;
    return list
        .map(
          (e) => CalendarConnection.fromJson(
            Map<String, dynamic>.from(e as Map),
          ),
        )
        .toList();
  }

  Future<String> getConnectUrl(CalendarProvider provider) async {
    final res = await _session.get('/calendar-connections/$provider/connect');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to get connect URL'));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final url = data['redirectUrl'] as String?;
    if (url == null || url.isEmpty) {
      throw Exception('Connect URL missing from server response');
    }
    return url;
  }

  Future<void> disconnect(String connectionId) async {
    final res = await _session.delete('/calendar-connections/$connectionId');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to disconnect'));
    }
  }

  Future<void> sync(String connectionId) async {
    final res = await _session.get('/calendar-connections/$connectionId/sync');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to sync'));
    }
  }

  String _errorMessage(dynamic res, String fallback) {
    try {
      final body = jsonDecode(res.body as String) as Map<String, dynamic>;
      final message = body['message'];
      if (message is String) return message;
      if (message is List && message.isNotEmpty) {
        return message.map((e) => e.toString()).join(', ');
      }
    } catch (_) {}
    return fallback;
  }
}
