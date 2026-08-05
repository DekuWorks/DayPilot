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
        return 'Token expired — sync may refresh';
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

  /// iCloud CalDAV: Apple ID + app-specific password.
  Future<CalendarConnection?> connectAppleCalDav({
    required String appleId,
    required String appSpecificPassword,
  }) async {
    await _ensureSession();
    final res = await _session.post(
      '/calendar-connections/apple/connect',
      body: {
        'appleId': appleId,
        'appSpecificPassword': appSpecificPassword,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(_errorMessage(res, 'Failed to connect iCloud Calendar'));
    }
    final data = jsonDecode(res.body);
    if (data is! Map) return null;
    return CalendarConnection.fromJson(Map<String, dynamic>.from(data));
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
