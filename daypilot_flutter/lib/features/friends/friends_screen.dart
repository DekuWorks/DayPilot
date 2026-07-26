import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'friends_repository.dart';

final friendsRepositoryProvider = Provider<FriendsRepository>((ref) {
  return FriendsRepository(ref.watch(supabaseClientProvider));
});

final friendsListProvider =
    FutureProvider.autoDispose<List<Friend>>((ref) async {
  return ref.watch(friendsRepositoryProvider).listFriends();
});

final friendRequestsProvider = FutureProvider.autoDispose<
    ({List<FriendRequest> incoming, List<FriendRequest> outgoing})>((ref) async {
  return ref.watch(friendsRepositoryProvider).listRequests();
});

/// Friends: list + requests + search (Supabase RPCs). Full web UI at daypilot.co/friends.
class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  final _search = TextEditingController();
  List<PublicUser> _results = const [];
  bool _searching = false;
  String? _searchError;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String q) async {
    if (q.trim().isEmpty) {
      setState(() {
        _results = const [];
        _searchError = null;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final rows =
          await ref.read(friendsRepositoryProvider).searchUsers(q.trim());
      if (!mounted) return;
      setState(() => _results = rows);
    } catch (e) {
      if (!mounted) return;
      setState(() => _searchError = e.toString());
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _openWebFriends() async {
    final uri = Uri.parse('https://www.daypilot.co/friends');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _refresh() {
    ref.invalidate(friendsListProvider);
    ref.invalidate(friendRequestsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final friends = ref.watch(friendsListProvider);
    final requests = ref.watch(friendRequestsProvider);

    return FeatureScaffold(
      title: 'Friends',
      actions: [
        IconButton(
          tooltip: 'Open on web',
          onPressed: _openWebFriends,
          icon: const Icon(Icons.open_in_new_rounded),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _search,
              decoration: InputDecoration(
                labelText: 'Search DayPilot users',
                hintText: 'Name or username',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
              ),
              textInputAction: TextInputAction.search,
              onChanged: (v) {
                // Debounce-lite: search after short pause via microtask chain
                Future<void>.delayed(const Duration(milliseconds: 280), () {
                  if (_search.text == v) _runSearch(v);
                });
              },
              onSubmitted: _runSearch,
            ),
            if (_searchError != null) ...[
              const SizedBox(height: 8),
              Text(
                _searchError!,
                style: const TextStyle(color: DayPilotColors.error),
              ),
            ],
            if (_results.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Search results',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              for (final u in _results)
                _UserTile(
                  user: u,
                  trailing: TextButton(
                    onPressed: () async {
                      try {
                        await ref
                            .read(friendsRepositoryProvider)
                            .sendRequest(u.id);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Request sent to ${u.label}')),
                        );
                        _refresh();
                      } catch (e) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('$e')),
                        );
                      }
                    },
                    child: const Text('Add'),
                  ),
                ),
            ],
            const SizedBox(height: 20),
            Text(
              'Requests',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            requests.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('$e'),
              data: (data) {
                if (data.incoming.isEmpty && data.outgoing.isEmpty) {
                  return const Text(
                    'No pending requests.',
                    style: TextStyle(color: DayPilotColors.textSecondary),
                  );
                }
                return Column(
                  children: [
                    for (final r in data.incoming)
                      _RequestTile(
                        request: r,
                        onAccept: () async {
                          await ref
                              .read(friendsRepositoryProvider)
                              .acceptRequest(r.id);
                          _refresh();
                        },
                        onDecline: () async {
                          await ref
                              .read(friendsRepositoryProvider)
                              .declineRequest(r.id);
                          _refresh();
                        },
                      ),
                    for (final r in data.outgoing)
                      _RequestTile(
                        request: r,
                        onCancel: () async {
                          await ref
                              .read(friendsRepositoryProvider)
                              .cancelRequest(r.id);
                          _refresh();
                        },
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),
            Text(
              'Your friends',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            friends.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('$e'),
              data: (list) {
                if (list.isEmpty) {
                  return const Text(
                    'No friends yet. Search above to send a request.',
                    style: TextStyle(color: DayPilotColors.textSecondary),
                  );
                }
                return Column(
                  children: [
                    for (final f in list)
                      _UserTile(
                        user: f,
                        subtitle: f.isFavorite ? 'Pinned favorite' : null,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: f.isFavorite ? 'Unpin' : 'Pin favorite',
                              onPressed: () async {
                                final repo =
                                    ref.read(friendsRepositoryProvider);
                                try {
                                  if (f.isFavorite) {
                                    await repo.unpinFavorite(f.id);
                                  } else {
                                    await repo.pinFavorite(f.id);
                                  }
                                  _refresh();
                                } catch (e) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('$e')),
                                  );
                                }
                              },
                              icon: Icon(
                                f.isFavorite
                                    ? Icons.push_pin_rounded
                                    : Icons.push_pin_outlined,
                                color: f.isFavorite
                                    ? DayPilotColors.brand500
                                    : null,
                              ),
                            ),
                            IconButton(
                              tooltip: 'Remove',
                              onPressed: () async {
                                await ref
                                    .read(friendsRepositoryProvider)
                                    .removeFriend(f.id);
                                _refresh();
                              },
                              icon: const Icon(Icons.person_remove_outlined),
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            TextButton.icon(
              onPressed: _openWebFriends,
              icon: const Icon(Icons.open_in_browser_rounded),
              label: const Text('Manage on daypilot.co'),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  const _UserTile({
    required this.user,
    this.trailing,
    this.subtitle,
  });

  final PublicUser user;
  final Widget? trailing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final handle = user.username;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: DayPilotColors.brand500.withValues(alpha: 0.2),
        child: Text(
          user.label.isNotEmpty ? user.label[0].toUpperCase() : '?',
          style: const TextStyle(
            color: DayPilotColors.brand500,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title: Text(user.label),
      subtitle: Text(
        subtitle ??
            (handle != null && handle.isNotEmpty ? '@$handle' : 'DayPilot'),
        style: const TextStyle(color: DayPilotColors.textSecondary),
      ),
      trailing: trailing,
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.request,
    this.onAccept,
    this.onDecline,
    this.onCancel,
  });

  final FriendRequest request;
  final Future<void> Function()? onAccept;
  final Future<void> Function()? onDecline;
  final Future<void> Function()? onCancel;

  @override
  Widget build(BuildContext context) {
    final label = request.otherUser?.label ?? 'DayPilot user';
    final isIncoming = request.direction == 'incoming';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: Text(isIncoming ? 'Wants to be friends' : 'Request pending'),
      trailing: isIncoming
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton(onPressed: onDecline, child: const Text('Decline')),
                FilledButton(
                  onPressed: onAccept,
                  child: const Text('Accept'),
                ),
              ],
            )
          : TextButton(onPressed: onCancel, child: const Text('Cancel')),
    );
  }
}
