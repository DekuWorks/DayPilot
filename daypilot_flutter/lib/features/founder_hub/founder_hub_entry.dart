import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';

/// Account links for Founder Hub and the owner's inbox.
/// Visibility comes from the Nest account payload, not an email in the app.
class FounderHubEntry extends ConsumerStatefulWidget {
  const FounderHubEntry({super.key});

  @override
  ConsumerState<FounderHubEntry> createState() => _FounderHubEntryState();
}

class _FounderHubEntryState extends ConsumerState<FounderHubEntry> {
  bool _owner = false;
  int _unread = 0;
  bool _hub = false;
  int _replies = 0;
  String? _label;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = FounderHubApi(ref.read(nestApiSessionProvider));
    try {
      final account = await api.account();
      final hub = account['founderHub'];
      if (hub is Map) {
        _owner = hub['isOwner'] == true;
        _unread = (hub['unreadCount'] as num?)?.toInt() ?? 0;
      }
    } catch (_) {}
    try {
      final summary = await api.summary();
      _hub = summary['canRead'] == true;
      _replies = (summary['unreadReplyCount'] as num?)?.toInt() ?? 0;
      _label = summary['label'] as String?;
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (!_owner && !_hub) return const SizedBox.shrink();
    return Column(
      children: [
        if (_hub) ...[
          NavTile(
            icon: Icons.forum_outlined,
            title: 'Founder Hub',
            subtitle: () {
              final parts = <String>[
                if (_label != null && _label!.isNotEmpty) _label!,
                if (_replies > 0) '$_replies unread',
              ];
              if (parts.isEmpty) return null;
              return parts.join(' · ');
            }(),
            onTap: () => context.push('/settings/founder-hub'),
          ),
          const SizedBox(height: 8),
        ],
        if (_owner) ...[
          NavTile(
            icon: Icons.mark_email_unread_outlined,
            title: _unread > 0 ? 'Founder messages ($_unread)' : 'Founder messages',
            subtitle: 'Suggestions from founding members',
            onTap: () => context.push('/settings/founder-inbox'),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
