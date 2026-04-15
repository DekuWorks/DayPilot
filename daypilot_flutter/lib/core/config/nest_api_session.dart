import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'daypilot_env.dart';

const _kAccess = 'nest_access_token';
const _kRefresh = 'nest_refresh_token';

/// Persists Nest JWTs (after Supabase exchange) and performs authenticated API calls.
class NestApiSession {
  NestApiSession(this._prefs);

  final SharedPreferences _prefs;

  String get baseUrl => DayPilotEnv.daypilotApiUrl.replaceAll(RegExp(r'/$'), '');

  String? get _access => _prefs.getString(_kAccess);
  String? get _refresh => _prefs.getString(_kRefresh);

  bool get hasSession => _access != null && _access!.isNotEmpty;

  Future<void> clear() async {
    await _prefs.remove(_kAccess);
    await _prefs.remove(_kRefresh);
  }

  Future<void> _storeTokens({
    required String access,
    required String refresh,
  }) async {
    await _prefs.setString(_kAccess, access);
    await _prefs.setString(_kRefresh, refresh);
  }

  /// Call after Supabase sign-in / sign-up when [DayPilotEnv.hasDaypilotApi].
  Future<void> exchangeFromSupabaseSession() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    await exchangeSupabaseAccessToken(session.accessToken);
  }

  Future<void> exchangeSupabaseAccessToken(String supabaseAccessToken) async {
    final uri = Uri.parse('$baseUrl/auth/supabase-exchange');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'accessToken': supabaseAccessToken}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'API exchange failed (${res.statusCode}): ${res.body}',
      );
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final access = data['accessToken'] as String?;
    final refresh = data['refreshToken'] as String?;
    if (access == null || refresh == null) {
      throw Exception('Invalid exchange response');
    }
    await _storeTokens(access: access, refresh: refresh);
  }

  Future<void> refreshTokens() async {
    final rt = _refresh;
    if (rt == null) return;
    final uri = Uri.parse('$baseUrl/auth/refresh');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': rt}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      await clear();
      throw Exception('Session expired. Sign in again.');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final access = data['accessToken'] as String?;
    final refresh = data['refreshToken'] as String?;
    if (access == null || refresh == null) {
      await clear();
      throw Exception('Invalid refresh response');
    }
    await _storeTokens(access: access, refresh: refresh);
  }

  Future<Map<String, String>> authHeaders() async {
    var token = _access;
    if (token == null || token.isEmpty) {
      throw StateError('No Nest API session');
    }
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  Future<http.Response> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    return _send(() async {
      final headers = await authHeaders();
      return http.get(uri, headers: headers);
    });
  }

  Future<http.Response> post(String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() async {
      final headers = await authHeaders();
      return http.post(
        uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  Future<http.Response> patch(String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() async {
      final headers = await authHeaders();
      return http.patch(
        uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  Future<http.Response> delete(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() async {
      final headers = await authHeaders();
      return http.delete(uri, headers: headers);
    });
  }

  Future<http.Response> _send(Future<http.Response> Function() send) async {
    var res = await send();
    if (res.statusCode == 401 && _refresh != null) {
      try {
        await refreshTokens();
        res = await send();
      } catch (_) {
        rethrow;
      }
    }
    return res;
  }
}
