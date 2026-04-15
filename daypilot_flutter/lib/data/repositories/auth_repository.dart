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

  /// After cold start: exchange Supabase session for Nest JWTs (Option C).
  Future<void> syncApiSession() => _linkApiIfNeeded();

  Future<void> _linkApiIfNeeded() async {
    if (!DayPilotEnv.hasDaypilotApi || _apiSession == null) return;
    final session = _client.auth.currentSession;
    if (session == null) return;
    try {
      await _apiSession.exchangeFromSupabaseSession();
    } catch (_) {
      // Network / misconfigured API — user can still use Supabase-only flows
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
