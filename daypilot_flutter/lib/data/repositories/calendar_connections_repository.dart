import 'dart:convert';

import '../../core/config/nest_api_session.dart';

typedef CalendarProvider = String; // google | outlook | apple

/// Token / connection health from Nest list + validate endpoints.
enum ConnectionValidationStatus {
  valid,
  expired,
  needsReconnect,
  unknown;

  static ConnectionValidationStatus fromApi(String? raw) {
    switch (raw) {
      case 'valid':
        return ConnectionValidationStatus.valid;
      case 'expired':
        return ConnectionValidationStatus.expired;
      case 'needs_reconnect':
        return ConnectionValidationStatus.needsReconnect;
      default:
        return ConnectionValidationStatus.unknown;
    }
  }

  String get label {
    switch (this) {
      case ConnectionValidationStatus.valid:
        return 'Validated';
      case ConnectionValidationStatus.expired:
        return 'Token expired';
      case ConnectionValidationStatus.needsReconnect:
        return 'Needs reconnect';
      case ConnectionValidationStatus.unknown:
        return 'Not validated yet';
    }
  }
}

class CalendarConnection {
  const CalendarConnection({
    required this.id,
    required this.provider,
    required this.email,
    this.syncedAt,
    this.validatedAt,
    this.expiresAt,
    required this.connectedAt,
    this.status = ConnectionValidationStatus.unknown,
  });

  final String id;
  final CalendarProvider provider;
  final String email;
  final DateTime? syncedAt;
  final DateTime? validatedAt;
  final DateTime? expiresAt;
  final DateTime connectedAt;
  final ConnectionValidationStatus status;

  factory CalendarConnection.fromJson(Map<String, dynamic> json) {
    DateTime? parse(String key) {
      final v = json[key];
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return CalendarConnection(
      id: json['id'].toString(),
      provider: json['provider'] as String? ?? 'google',
      email: json['email'] as String? ?? '',
      syncedAt: parse('syncedAt'),
      validatedAt: parse('validatedAt'),
      expiresAt: parse('expiresAt'),
      connectedAt: parse('connectedAt') ?? DateTime.now(),
      status: ConnectionValidationStatus.fromApi(json['status'] as String?),
    );
  }
}

class ValidateConnectionResult {
  const ValidateConnectionResult({
    required this.ok,
    required this.valid,
    required this.status,
    this.validatedAt,
    this.error,
  });

  final bool ok;
  final bool valid;
  final ConnectionValidationStatus status;
  final DateTime? validatedAt;
  final String? error;

  factory ValidateConnectionResult.fromJson(Map<String, dynamic> json) {
    final validatedRaw = json['validatedAt'];
    return ValidateConnectionResult(
      ok: json['ok'] == true,
      valid: json['valid'] == true,
      status: ConnectionValidationStatus.fromApi(json['status'] as String?),
      validatedAt: validatedRaw == null
          ? null
          : DateTime.tryParse(validatedRaw.toString()),
      error: json['error'] as String?,
    );
  }
}

/// Nest `/calendar-connections` — Google, Outlook, Apple OAuth.
class CalendarConnectionsRepository {
  CalendarConnectionsRepository(this._session);

  final NestApiSession _session;

  Future<void> _ensureSession() async {
    if (_session.hasSession) return;
    await _session.exchangeFromSupabaseSession();
    if (!_session.hasSession) {
      throw Exception(
        'Calendar sync session missing. Sign in again, then open Sync.',
      );
    }
  }

  Future<List<CalendarConnection>> listConnections() async {
    await _ensureSession();
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

  /// Store Graph tokens from Supabase Azure SSO (`provider_token`).
  Future<void> importOutlookProviderToken({
    required String accessToken,
    String? refreshToken,
    int? expiresIn,
  }) async {
    await _ensureSession();
    final res = await _session.post(
      '/calendar-connections/outlook/from-token',
      body: {
        'accessToken': accessToken,
        'refreshToken': ?refreshToken,
        'expiresIn': ?expiresIn,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to import Outlook token'));
    }
  }

  Future<String> getConnectUrl(CalendarProvider provider) async {
    await _ensureSession();
    final res = await _session.get('/calendar-connections/$provider/connect');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to get connect URL'));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['needsCredentials'] == true) {
      throw Exception('ICLOUD_NEEDS_CREDENTIALS');
    }
    final url = data['redirectUrl'] as String?;
    if (url == null || url.isEmpty) {
      throw Exception('Connect URL missing from server response');
    }
    return url;
  }

  /// Strip spaces from Apple app-specific passwords before send.
  static String normalizeAppSpecificPassword(String raw) {
    return raw.replaceAll(RegExp(r'[\s\u00A0\u202F\u2007]+'), '').trim();
  }

  /// iCloud CalDAV: Apple ID + app-specific password.
  Future<CalendarConnection?> connectAppleCalDav({
    required String appleId,
    required String appSpecificPassword,
  }) async {
    await _ensureSession();
    final res = await _session.post(
      '/calendar-connections/apple/connect',
      body: {
        'appleId': appleId.trim().toLowerCase(),
        'appSpecificPassword':
            normalizeAppSpecificPassword(appSpecificPassword),
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to connect iCloud Calendar'));
    }
    final data = jsonDecode(res.body);
    if (data is! Map) return null;
    return CalendarConnection.fromJson(Map<String, dynamic>.from(data));
  }

  /// Full EventKit sync (calendars + events).
  Future<Map<String, dynamic>> syncEventKit({
    required String deviceId,
    required String deviceLabel,
    required List<Map<String, dynamic>> calendars,
    required List<Map<String, dynamic>> events,
    bool reconcileDeletes = true,
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) async {
    await _ensureSession();
    final now = DateTime.now().toUtc();
    final res = await _session.post(
      '/calendar-connections/apple/eventkit/sync',
      body: {
        'deviceId': deviceId,
        'deviceLabel': deviceLabel,
        'calendars': calendars,
        'events': events,
        'reconcileDeletes': reconcileDeletes,
        'rangeStart': (rangeStart ?? now.subtract(const Duration(days: 90)))
            .toIso8601String(),
        'rangeEnd':
            (rangeEnd ?? now.add(const Duration(days: 365))).toIso8601String(),
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to sync Apple Calendar'));
    }
    final data = jsonDecode(res.body);
    if (data is Map) return Map<String, dynamic>.from(data);
    return {'ok': true};
  }

  Future<Map<String, dynamic>> getEventKitStatus({String? deviceId}) async {
    await _ensureSession();
    final res = await _session.get(
      '/calendar-connections/apple/eventkit',
      query: deviceId == null ? null : {'deviceId': deviceId},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to load Apple Calendar status'));
    }
    final data = jsonDecode(res.body);
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }

  Future<void> disconnectEventKit({
    String? deviceId,
    bool keepEvents = true,
  }) async {
    await _ensureSession();
    final res = await _session.delete(
      '/calendar-connections/apple/eventkit',
      query: {
        'keepEvents': keepEvents ? 'true' : 'false',
        if (deviceId != null && deviceId.isNotEmpty) 'deviceId': deviceId,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        _errorMessage(res, 'Failed to disconnect Apple Calendar'),
      );
    }
  }

  Future<void> disconnect(String connectionId) async {
    await _ensureSession();
    final res = await _session.delete('/calendar-connections/$connectionId');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to disconnect'));
    }
  }

  Future<void> sync(String connectionId) async {
    await _ensureSession();
    final res = await _session.get('/calendar-connections/$connectionId/sync');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to sync'));
    }
  }

  Future<ValidateConnectionResult> validate(String connectionId) async {
    await _ensureSession();
    final res =
        await _session.get('/calendar-connections/$connectionId/validate');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to validate connection'));
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ValidateConnectionResult.fromJson(data);
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
