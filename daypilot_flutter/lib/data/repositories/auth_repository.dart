import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/config/nest_api_session.dart';

class AuthRepository {
  AuthRepository(this._client, {NestApiSession? apiSession})
      : _apiSession = apiSession;

  final SupabaseClient _client;
  final NestApiSession? _apiSession;

  Session? get currentSession => _client.auth.currentSession;

  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

  /// After cold start / explicit retry: exchange Supabase JWT for Nest tokens.
  /// No-op if Option C is disabled or there is no Supabase session.
  /// Throws on network / API errors so the UI can show Retry.
  Future<void> syncApiSessionStrict() async {
    final nest = _apiSession;
    if (!DayPilotEnv.hasDaypilotApi || nest == null) return;
    final session = _client.auth.currentSession;
    if (session == null) return;
    await nest.exchangeFromSupabaseSession();
  }

  Future<void> _linkApiIfNeeded() async {
    final nest = _apiSession;
    if (!DayPilotEnv.hasDaypilotApi || nest == null) return;
    final session = _client.auth.currentSession;
    if (session == null) return;
    try {
      await nest.exchangeFromSupabaseSession();
    } catch (_) {
      // Non-blocking after sign-in — dashboard notifier + Retry handle recovery
    }
  }

  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final res = await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
    await _linkApiIfNeeded();
    return res;
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    final res = await _client.auth.signUp(email: email, password: password);
    await _linkApiIfNeeded();
    return res;
  }

  Future<void> resetPasswordForEmail(String email) {
    return _client.auth.resetPasswordForEmail(email);
  }

  /// Email magic link (same flow as web). Opens via emailRedirectTo.
  Future<void> signInWithMagicLink(String email) {
    return _client.auth.signInWithOtp(
      email: email.trim(),
      shouldCreateUser: true,
      emailRedirectTo: 'https://www.daypilot.co/auth/callback',
    );
  }

  /// Google OAuth — opens browser; returns via deep link.
  ///
  /// Requires Google enabled in Supabase Auth (see docs/GOOGLE_AUTH_SETUP.md).
  Future<bool> signInWithGoogle() async {
    try {
      return await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'com.daypilot.daypilot://login-callback/',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
    } on AuthException catch (e) {
      final msg = e.message.toLowerCase();
      if (msg.contains('provider is not enabled') ||
          msg.contains('unsupported provider')) {
        throw AuthException(
          'Google sign-in is not enabled yet. '
          'Add a Google OAuth client in Supabase Auth → Providers → Google '
          '(see docs/GOOGLE_AUTH_SETUP.md), then try again.',
          statusCode: e.statusCode,
          code: e.code,
        );
      }
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
    if (_apiSession != null) {
      await _apiSession.clear();
    }
  }
}
