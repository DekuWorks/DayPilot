import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/providers/bootstrap_providers.dart';

const kProfileSelect =
    'first_name, last_name, username, display_name, name, email, avatar_url';

final currentProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  var row = await client
      .from('profiles')
      .select(kProfileSelect)
      .eq('id', uid)
      .maybeSingle();
  final seeded = await persistSharedAvatarIfMissing(client, row);
  if (seeded != null) {
    row = {...?row, 'avatar_url': seeded};
  }
  return row;
});

String profileDisplayName(Map<String, dynamic>? p, String emailFallback) {
  final first = (p?['first_name'] as String?)?.trim() ?? '';
  final last = (p?['last_name'] as String?)?.trim() ?? '';
  final legal = [first, last].where((s) => s.isNotEmpty).join(' ');
  if (legal.isNotEmpty) return legal;
  final display = (p?['display_name'] as String?)?.trim() ?? '';
  if (display.isNotEmpty) return display;
  final name = (p?['name'] as String?)?.trim() ?? '';
  if (name.isNotEmpty) return name;
  if (emailFallback.isNotEmpty) return emailFallback.split('@').first;
  return 'Pilot';
}

String profileInitials(String display) {
  if (display.isEmpty) return 'D';
  return display.substring(0, 1).toUpperCase();
}

String? profileAvatarUrl(Map<String, dynamic>? p) {
  final url = (p?['avatar_url'] as String?)?.trim();
  if (url == null || url.isEmpty) return null;
  return url;
}

/// Google / Apple / Microsoft put the photo on the auth user, not profiles.
String? authMetadataAvatarUrl(User? user) {
  final meta = user?.userMetadata;
  if (meta == null) return null;
  for (final key in const ['avatar_url', 'picture', 'avatar']) {
    final value = meta[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
  }
  return null;
}

String? resolveAvatarUrl(Map<String, dynamic>? p, User? user) {
  return profileAvatarUrl(p) ?? authMetadataAvatarUrl(user);
}

/// Copy the SSO photo into `profiles.avatar_url` so web and iOS share one URL.
Future<String?> persistSharedAvatarIfMissing(
  SupabaseClient client,
  Map<String, dynamic>? profile,
) async {
  if (profileAvatarUrl(profile) != null) return null;
  final fromAuth = authMetadataAvatarUrl(client.auth.currentUser);
  if (fromAuth == null) return null;
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  await client.from('profiles').update({
    'avatar_url': fromAuth,
    'updated_at': DateTime.now().toIso8601String(),
  }).eq('id', uid);
  return fromAuth;
}
