import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/api_session_sync_provider.dart';
import '../../core/providers/bootstrap_providers.dart';
import 'founder_hub_api.dart';

/// Home-screen shortcut above the calendar.
/// Shown only when Nest marks this account as the hub owner.
class FounderHubHomeButton extends ConsumerStatefulWidget {
  const FounderHubHomeButton({super.key});

  @override
  ConsumerState<FounderHubHomeButton> createState() =>
      _FounderHubHomeButtonState();
}

class _FounderHubHomeButtonState extends ConsumerState<FounderHubHomeButton> {
  bool _owner = false;
  int _unread = 0;
  int _ticket = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final ticket = ++_ticket;
    try {
      final account = await FounderHubApi(ref.read(nestApiSessionProvider))
          .account();
      final hub = account['founderHub'];
      if (ticket != _ticket || !mounted || hub is! Map) return;
      setState(() {
        _owner = hub['isOwner'] == true;
        _unread = (hub['unreadCount'] as num?)?.toInt() ?? 0;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(apiSessionSyncProvider, (prev, next) {
      if (next.status == ApiSessionSyncStatus.ready &&
          prev?.status != ApiSessionSyncStatus.ready) {
        _load();
      }
    });
    if (!_owner) return const SizedBox.shrink();
    final label = _unread > 0 ? 'Founder Hub ($_unread)' : 'Founder Hub';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: () => context.push('/settings/founder-inbox'),
          child: Text(label),
        ),
      ),
    );
  }
}
