import 'package:supabase_flutter/supabase_flutter.dart';

/// Public profile fields returned by friends RPCs (never email).
class PublicUser {
  const PublicUser({
    required this.id,
    this.username,
    this.firstName,
    this.lastName,
    this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String? username;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? avatarUrl;

  factory PublicUser.fromRow(Map<String, dynamic> row) {
    return PublicUser(
      id: row['id'] as String,
      username: row['username'] as String?,
      firstName: row['first_name'] as String?,
      lastName: row['last_name'] as String?,
      displayName: row['display_name'] as String?,
      avatarUrl: row['avatar_url'] as String?,
    );
  }

  String get label {
    final fromParts = [firstName, lastName].whereType<String>().join(' ').trim();
    if (displayName != null && displayName!.trim().isNotEmpty) {
      return displayName!.trim();
    }
    if (fromParts.isNotEmpty) return fromParts;
    if (username != null && username!.isNotEmpty) return '@$username';
    return 'DayPilot user';
  }
}

class Friend extends PublicUser {
  const Friend({
    required super.id,
    super.username,
    super.firstName,
    super.lastName,
    super.displayName,
    super.avatarUrl,
    required this.friendsSince,
    required this.isFavorite,
  });

  final DateTime friendsSince;
  final bool isFavorite;
}

class FriendRequest {
  const FriendRequest({
    required this.id,
    required this.requesterId,
    required this.recipientId,
    required this.createdAt,
    required this.direction,
    this.otherUser,
  });

  final String id;
  final String requesterId;
  final String recipientId;
  final DateTime createdAt;
  final String direction; // incoming | outgoing
  final PublicUser? otherUser;
}

/// Supabase-backed friends graph (same RPCs as the web app).
class FriendsRepository {
  FriendsRepository(this._client);

  final SupabaseClient _client;

  static const maxFavorites = 5;

  String? get _uid => _client.auth.currentUser?.id;

  Future<List<PublicUser>> searchUsers(String query) async {
    final q = query.trim();
    if (q.isEmpty) return const [];
    final rows = await _client.rpc(
      'search_daypilot_users',
      params: {'search_query': q, 'result_limit': 20},
    );
    return (rows as List)
        .map((e) => PublicUser.fromRow(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<Map<String, PublicUser>> _profiles(List<String> ids) async {
    final unique = ids.where((id) => id.isNotEmpty).toSet().toList();
    if (unique.isEmpty) return {};
    final rows = await _client.rpc(
      'get_public_profiles',
      params: {'user_ids': unique},
    );
    final map = <String, PublicUser>{};
    for (final row in rows as List) {
      final u = PublicUser.fromRow(Map<String, dynamic>.from(row as Map));
      map[u.id] = u;
    }
    return map;
  }

  Future<List<Friend>> listFriends() async {
    final uid = _uid;
    if (uid == null) return const [];

    final friendshipRows = await _client
        .from('friendships')
        .select('friend_id, created_at')
        .eq('user_id', uid)
        .order('created_at', ascending: false);
    final favRows = await _client
        .from('user_favorites')
        .select('favorited_user_id')
        .eq('user_id', uid);

    final rows = (friendshipRows as List)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final favoriteIds = {
      for (final r in favRows as List)
        Map<String, dynamic>.from(r as Map)['favorited_user_id'] as String,
    };

    final profiles = await _profiles(
      rows.map((r) => r['friend_id'] as String).toList(),
    );

    final friends = <Friend>[];
    for (final r in rows) {
      final id = r['friend_id'] as String;
      final p = profiles[id];
      if (p == null) continue;
      friends.add(
        Friend(
          id: p.id,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          friendsSince: DateTime.parse(r['created_at'] as String),
          isFavorite: favoriteIds.contains(id),
        ),
      );
    }
    friends.sort((a, b) {
      if (a.isFavorite != b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.label.toLowerCase().compareTo(b.label.toLowerCase());
    });
    return friends;
  }

  Future<({List<FriendRequest> incoming, List<FriendRequest> outgoing})>
      listRequests() async {
    final uid = _uid;
    if (uid == null) {
      return (incoming: <FriendRequest>[], outgoing: <FriendRequest>[]);
    }
    final data = await _client
        .from('friend_requests')
        .select('id, requester_id, recipient_id, status, created_at')
        .eq('status', 'pending')
        .or('requester_id.eq.$uid,recipient_id.eq.$uid')
        .order('created_at', ascending: false);

    final rows =
        (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final otherIds = rows
        .map(
          (r) => r['requester_id'] == uid
              ? r['recipient_id'] as String
              : r['requester_id'] as String,
        )
        .toList();
    final profiles = await _profiles(otherIds);

    final mapped = rows.map((r) {
      final direction =
          r['recipient_id'] == uid ? 'incoming' : 'outgoing';
      final otherId = direction == 'incoming'
          ? r['requester_id'] as String
          : r['recipient_id'] as String;
      return FriendRequest(
        id: r['id'] as String,
        requesterId: r['requester_id'] as String,
        recipientId: r['recipient_id'] as String,
        createdAt: DateTime.parse(r['created_at'] as String),
        direction: direction,
        otherUser: profiles[otherId],
      );
    }).toList();

    return (
      incoming: mapped.where((r) => r.direction == 'incoming').toList(),
      outgoing: mapped.where((r) => r.direction == 'outgoing').toList(),
    );
  }

  Future<void> sendRequest(String recipientId) async {
    await _client.rpc(
      'send_friend_request',
      params: {'p_recipient_id': recipientId},
    );
  }

  Future<void> acceptRequest(String requestId) async {
    await _client.rpc(
      'respond_friend_request',
      params: {'p_request_id': requestId, 'p_accept': true},
    );
  }

  Future<void> declineRequest(String requestId) async {
    await _client.rpc(
      'respond_friend_request',
      params: {'p_request_id': requestId, 'p_accept': false},
    );
  }

  Future<void> cancelRequest(String requestId) async {
    await _client.rpc(
      'cancel_friend_request',
      params: {'p_request_id': requestId},
    );
  }

  Future<void> removeFriend(String friendId) async {
    await _client.rpc(
      'remove_friend',
      params: {'p_friend_id': friendId},
    );
  }

  Future<void> pinFavorite(String favoritedUserId) async {
    final uid = _uid;
    if (uid == null) throw StateError('Not signed in');
    final existing = await _client
        .from('user_favorites')
        .select('favorited_user_id')
        .eq('user_id', uid);
    if ((existing as List).length >= maxFavorites) {
      throw Exception('You can pin up to $maxFavorites favorites');
    }
    await _client.from('user_favorites').insert({
      'user_id': uid,
      'favorited_user_id': favoritedUserId,
    });
  }

  Future<void> unpinFavorite(String favoritedUserId) async {
    final uid = _uid;
    if (uid == null) return;
    await _client
        .from('user_favorites')
        .delete()
        .eq('user_id', uid)
        .eq('favorited_user_id', favoritedUserId);
  }
}
