import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/config/nest_api_session.dart';

/// Deep link registered in Info.plist / AndroidManifest for OAuth return.
const kAuthCallbackRedirect = 'com.daypilot.daypilot://login-callback/';
const kAuthCallbackScheme = 'com.daypilot.daypilot';

class AuthRepository {
  AuthRepository(this._client, {NestApiSession? apiSession})
      : _apiSession = apiSession;

  final SupabaseClient _client;
  final NestApiSession? _apiSession;

  Session? get currentSession => _client.auth.currentSession;

  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

  bool get _usesInAppOAuth =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.iOS ||
          defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.macOS);

  bool get _usesNativeAppleSignIn =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.iOS ||
          defaultTargetPlatform == TargetPlatform.macOS);

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

  /// Completes Supabase OAuth inside ASWebAuthenticationSession / Custom Tabs
  /// (App Store Guideline 4 — do not hand off to Safari as the primary path).
  Future<void> _completeOAuthInApp({
    required OAuthProvider provider,
    String? scopes,
  }) async {
    final oauth = await _client.auth.getOAuthSignInUrl(
      provider: provider,
      redirectTo: kAuthCallbackRedirect,
      scopes: scopes,
    );
    final result = await FlutterWebAuth2.authenticate(
      url: oauth.url,
      callbackUrlScheme: kAuthCallbackScheme,
      options: const FlutterWebAuth2Options(
        // Share cookies with the system browser for SSO, but stay in-app.
        preferEphemeral: false,
      ),
    );
    await _client.auth.getSessionFromUrl(Uri.parse(result));
    await _linkApiIfNeeded();
  }

  AuthException _providerDisabled(AuthException e, String label) {
    final msg = e.message.toLowerCase();
    if (msg.contains('provider is not enabled') ||
        msg.contains('unsupported provider')) {
      return AuthException(
        '$label sign-in is unavailable right now. Try email sign-in, or try again later.',
        statusCode: e.statusCode,
        code: e.code,
      );
    }
    return e;
  }

  /// Google OAuth — in-app auth session on iOS/Android; no system Safari handoff.
  ///
  /// Requires Google enabled in Supabase Auth (see docs/GOOGLE_AUTH_SETUP.md).
  Future<bool> signInWithGoogle() async {
    try {
      if (_usesInAppOAuth) {
        await _completeOAuthInApp(provider: OAuthProvider.google);
        return true;
      }
      return await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: kAuthCallbackRedirect,
      );
    } on AuthException catch (e) {
      throw _providerDisabled(e, 'Google');
    }
  }

  /// Apple — native Sign in with Apple on iOS/macOS; in-app OAuth elsewhere.
  ///
  /// Requires Apple enabled in Supabase Auth (see docs/APPLE_AUTH_SETUP.md).
  Future<bool> signInWithApple() async {
    try {
      if (_usesNativeAppleSignIn) {
        await _signInWithAppleNative();
        return true;
      }
      if (_usesInAppOAuth) {
        await _completeOAuthInApp(provider: OAuthProvider.apple);
        return true;
      }
      return await _client.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: kAuthCallbackRedirect,
      );
    } on AuthException catch (e) {
      throw _providerDisabled(e, 'Apple');
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        return false;
      }
      throw AuthException(e.message);
    }
  }

  Future<void> _signInWithAppleNative() async {
    final rawNonce = _client.auth.generateRawNonce();
    final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      nonce: hashedNonce,
    );
    final idToken = credential.identityToken;
    if (idToken == null) {
      throw const AuthException(
        'Could not find ID Token from Apple Sign in.',
      );
    }
    await _client.auth.signInWithIdToken(
      provider: OAuthProvider.apple,
      idToken: idToken,
      nonce: rawNonce,
    );
    final given = credential.givenName;
    final family = credential.familyName;
    if ((given != null && given.isNotEmpty) ||
        (family != null && family.isNotEmpty)) {
      try {
        await _client.auth.updateUser(
          UserAttributes(
            data: {
              if (given != null) 'given_name': given,
              if (family != null) 'family_name': family,
              'full_name': [given, family]
                  .whereType<String>()
                  .where((s) => s.isNotEmpty)
                  .join(' '),
            },
          ),
        );
      } catch (_) {
        // Name is best-effort; session is already established.
      }
    }
    await _linkApiIfNeeded();
  }

  /// Microsoft / Outlook OAuth — in-app auth session on mobile.
  ///
  /// Requires Azure enabled in Supabase Auth (see docs/OUTLOOK_AUTH_SETUP.md).
  Future<bool> signInWithMicrosoft() async {
    try {
      const scopes = 'email openid profile offline_access Calendars.ReadWrite';
      if (_usesInAppOAuth) {
        await _completeOAuthInApp(
          provider: OAuthProvider.azure,
          scopes: scopes,
        );
        return true;
      }
      return await _client.auth.signInWithOAuth(
        OAuthProvider.azure,
        redirectTo: kAuthCallbackRedirect,
        scopes: scopes,
      );
    } on AuthException catch (e) {
      throw _providerDisabled(e, 'Microsoft');
    }
  }

  /// True when the current Supabase user has a Google identity linked.
  bool get hasGoogleIdentity {
    final user = _client.auth.currentUser;
    if (user == null) return false;
    return user.identities?.any((i) => i.provider == 'google') ?? false;
  }

  /// True when the current Supabase user has a Microsoft/Azure identity linked.
  bool get hasMicrosoftIdentity {
    final user = _client.auth.currentUser;
    if (user == null) return false;
    return user.identities?.any(
          (i) => i.provider == 'azure' || i.provider == 'microsoft',
        ) ??
        false;
  }

  /// True when the current Supabase user has an Apple identity linked.
  bool get hasAppleIdentity {
    final user = _client.auth.currentUser;
    if (user == null) return false;
    return user.identities?.any((i) => i.provider == 'apple') ?? false;
  }

  /// Best-effort Apple ID email for CalDAV prefill (skips Hide My Email relays).
  String? get appleIdEmailForCalDav {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    for (final identity in user.identities ?? const []) {
      if (identity.provider != 'apple') continue;
      final email = identity.identityData?['email'];
      if (email is String &&
          email.contains('@') &&
          !email.toLowerCase().endsWith('@privaterelay.appleid.com')) {
        return email;
      }
    }
    final fallback = user.email;
    if (fallback != null &&
        fallback.contains('@') &&
        !fallback.toLowerCase().endsWith('@privaterelay.appleid.com')) {
      return fallback;
    }
    return null;
  }

  /// Permanently deletes Nest + Supabase account data (App Store 5.1.1(v)).
  ///
  /// Requires [DayPilotEnv.hasDaypilotApi] and a Nest JWT (exchanges if needed).
  Future<void> deleteAccount() async {
    final nest = _apiSession;
    if (!DayPilotEnv.hasDaypilotApi || nest == null) {
      throw StateError(
        'Account deletion requires DAYPILOT_API_URL. Contact support if this persists.',
      );
    }
    await nest.hydrate();
    if (!nest.hasSession) {
      await nest.exchangeFromSupabaseSession();
    }
    final res = await nest.delete(
      '/auth/me',
      body: const {'confirm': 'DELETE'},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Account deletion failed (${res.statusCode}): ${res.body}',
      );
    }
    await signOut();
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
    if (_apiSession != null) {
      await _apiSession.clear();
    }
  }
}
