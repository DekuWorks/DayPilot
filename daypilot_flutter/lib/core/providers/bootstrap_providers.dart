import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/nest_api_session.dart';
import '../routing/supabase_auth_listenable.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences not initialized');
});

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Nest JWT session (Option C). Used after Supabase → `/auth/supabase-exchange`.
final nestApiSessionProvider = Provider<NestApiSession>((ref) {
  return NestApiSession(ref.watch(sharedPreferencesProvider));
});

/// Drives go_router redirects when auth session changes.
final supabaseAuthListenableProvider = Provider<SupabaseAuthListenable>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final listenable = SupabaseAuthListenable(client);
  ref.onDispose(listenable.dispose);
  return listenable;
});

/// Supabase auth stream — used to re-run Nest exchange after sign-in / reset on sign-out.
final authStateChangeProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(supabaseClientProvider).auth.onAuthStateChange;
});
