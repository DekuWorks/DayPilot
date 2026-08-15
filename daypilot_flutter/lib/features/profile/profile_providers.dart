import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/bootstrap_providers.dart';

const kProfileSelect =
    'first_name, last_name, username, display_name, name, email, avatar_url';

final currentProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  return client.from('profiles').select(kProfileSelect).eq('id', uid).maybeSingle();
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
