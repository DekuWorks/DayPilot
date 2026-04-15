import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../routing/supabase_auth_listenable.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences not initialized');
});

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Drives go_router redirects when auth session changes.
final supabaseAuthListenableProvider = Provider<SupabaseAuthListenable>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final listenable = SupabaseAuthListenable(client);
  ref.onDispose(listenable.dispose);
  return listenable;
});
