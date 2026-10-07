import 'dart:convert';

import '../../core/config/nest_api_session.dart';

class FounderHubApi {
  FounderHubApi(this.session);

  final NestApiSession session;

  Future<Map<String, dynamic>> account() async {
    final body = await _json(await session.get('/auth/me'));
    return body;
  }

  Future<Map<String, dynamic>> summary() async {
    return _json(await session.get('/founder-hub'));
  }

  Future<List<Map<String, dynamic>>> suggestions() async {
    return _list(await session.get('/founder-hub/suggestions'));
  }

  Future<Map<String, dynamic>> createSuggestion({
    required String title,
    required String description,
    required String category,
    String? featureKey,
  }) async {
    return _json(
      await session.post(
        '/founder-hub/suggestions',
        body: {
          'title': title,
          'description': description,
          'category': category,
          'featureKey': ?featureKey,
        },
      ),
    );
  }

  Future<Map<String, dynamic>> suggestion(String id) async {
    return _json(await session.get('/founder-hub/suggestions/$id'));
  }

  Future<Map<String, dynamic>> reply(String id, String body) async {
    return _json(
      await session.post(
        '/founder-hub/suggestions/$id/messages',
        body: {'body': body},
      ),
    );
  }

  Future<void> uploadScreenshot({
    required String id,
    required String fileName,
    required String mimeType,
    required String dataBase64,
  }) async {
    await _json(
      await session.post(
        '/founder-hub/suggestions/$id/attachments',
        body: {
          'fileName': fileName,
          'mimeType': mimeType,
          'dataBase64': dataBase64,
        },
      ),
    );
  }

  Future<List<Map<String, dynamic>>> beta() async {
    return _list(await session.get('/founder-hub/beta?platform=ios'));
  }

  Future<List<Map<String, dynamic>>> setOptOut(String key, bool off) async {
    final path = '/founder-hub/beta/$key/opt-out';
    final res = off ? await session.post(path) : await session.delete(path);
    return _list(res);
  }

  Future<Map<String, dynamic>> prefs() async {
    return _json(await session.get('/founder-hub/notification-preferences'));
  }

  Future<Map<String, dynamic>> savePrefs(Map<String, dynamic> prefs) async {
    return _json(
      await session.patch('/founder-hub/notification-preferences', body: prefs),
    );
  }

  Future<List<Map<String, dynamic>>> inbox({
    String? category,
    String? status,
    String? q,
    bool unread = false,
  }) async {
    final params = <String, String>{
      if (category != null && category.isNotEmpty) 'category': category,
      if (status != null && status.isNotEmpty) 'status': status,
      if (q != null && q.isNotEmpty) 'q': q,
      if (unread) 'unread': '1',
    };
    return _list(await session.get('/founder-hub/inbox', query: params));
  }

  Future<Map<String, dynamic>> inboxThread(String id) async {
    return _json(await session.get('/founder-hub/inbox/$id'));
  }

  Future<Map<String, dynamic>> inboxReply(String id, String body) async {
    return _json(
      await session.post('/founder-hub/inbox/$id/reply', body: {'body': body}),
    );
  }

  Future<Map<String, dynamic>> inboxNote(String id, String body) async {
    return _json(
      await session.post('/founder-hub/inbox/$id/notes', body: {'body': body}),
    );
  }

  Future<Map<String, dynamic>> alerts() async {
    return _json(await session.get('/founder-hub/inbox/alerts'));
  }

  Future<void> registerDevice(String token) async {
    await _json(
      await session.post(
        '/founder-hub/devices',
        body: {'token': token, 'platform': 'ios', 'provider': 'fcm'},
      ),
    );
  }

  Future<Map<String, dynamic>> _json(dynamic res) async {
    final body = _decode(res);
    if (res.statusCode >= 400) {
      throw Exception(_message(body, res.statusCode as int));
    }
    if (body is Map<String, dynamic>) return body;
    if (body is Map) return Map<String, dynamic>.from(body);
    return {};
  }

  Future<List<Map<String, dynamic>>> _list(dynamic res) async {
    final body = _decode(res);
    if (res.statusCode >= 400) {
      throw Exception(_message(body, res.statusCode as int));
    }
    if (body is! List) return const [];
    return body
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  Object? _decode(dynamic res) {
    final raw = res.body as String;
    if (raw.isEmpty) return null;
    return jsonDecode(raw);
  }

  String _message(Object? body, int status) {
    if (body is Map && body['message'] is String) return body['message'] as String;
    if (body is Map && body['message'] is List) {
      return (body['message'] as List).join(', ');
    }
    return 'Request failed ($status)';
  }
}
