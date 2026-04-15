/// Maps to your Supabase `profiles` or auth metadata — extend fields as the schema solidifies.
class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String? displayName;
  final String? avatarUrl;

  UserProfile copyWith({
    String? id,
    String? email,
    String? displayName,
    String? avatarUrl,
  }) {
    return UserProfile(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}
