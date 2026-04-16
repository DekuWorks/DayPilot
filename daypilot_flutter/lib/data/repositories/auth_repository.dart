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

  Future<void> signOut() async {
    await _client.auth.signOut();
    if (_apiSession != null) {
      await _apiSession.clear();
    }
  }
}
