import 'package:daypilot_flutter/features/profile/profile_providers.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  test('prefers the shared profiles.avatar_url', () {
    expect(
      resolveAvatarUrl(
        {'avatar_url': 'https://cdn.example/me.jpg'},
        null,
      ),
      'https://cdn.example/me.jpg',
    );
  });

  test('falls back to SSO metadata so iOS matches the web photo', () {
    final user = User(
      id: 'u1',
      appMetadata: const {},
      userMetadata: const {
        'avatar_url': 'https://lh3.googleusercontent.com/photo.jpg',
      },
      aud: 'authenticated',
      createdAt: '2026-08-15T00:00:00.000Z',
    );
    expect(
      resolveAvatarUrl({'avatar_url': null}, user),
      'https://lh3.googleusercontent.com/photo.jpg',
    );
    expect(
      authMetadataAvatarUrl(
        User(
          id: 'u1',
          appMetadata: const {},
          userMetadata: const {
            'picture': 'https://graph.microsoft.com/photo',
          },
          aud: 'authenticated',
          createdAt: '2026-08-15T00:00:00.000Z',
        ),
      ),
      'https://graph.microsoft.com/photo',
    );
  });
}
