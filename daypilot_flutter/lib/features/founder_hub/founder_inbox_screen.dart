import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';
import 'founder_owner_message.dart';

class FounderInboxScreen extends ConsumerStatefulWidget {
  const FounderInboxScreen({super.key});

  @override
  ConsumerState<FounderInboxScreen> createState() => _FounderInboxScreenState();
}

class _FounderInboxScreenState extends ConsumerState<FounderInboxScreen> {
  List<Map<String, dynamic>> _items = const [];
  List<MessageableFounder> _founders = const [];
  bool _owner = false;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = FounderHubApi(ref.read(nestApiSessionProvider));
    try {
      final items = await api.inbox();
      final access = await _ownerAccess(api);
      if (!mounted) return;
      setState(() {
        _items = items;
        _owner = access.owner;
        _founders = access.founders;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  Future<({bool owner, List<MessageableFounder> founders})> _ownerAccess(
    FounderHubApi api,
  ) async {
    try {
      final account = await api.account();
      final hub = account['founderHub'];
      if (hub is! Map || hub['isOwner'] != true) {
        return (owner: false, founders: const <MessageableFounder>[]);
      }
    } catch (_) {
      return (owner: false, founders: const <MessageableFounder>[]);
    }
    try {
      final people = await api.people();
      return (
        owner: true,
        founders: messageableFounders(_rows(people['founding'])),
      );
    } catch (_) {
      return (owner: true, founders: const <MessageableFounder>[]);
    }
  }

  List<Map<String, dynamic>> _rows(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  Future<void> _messageFounder() async {
    if (!_owner || !mounted) return;
    final api = FounderHubApi(ref.read(nestApiSessionProvider));
    final threadId = await showOwnerMessageDialog(
      context: context,
      founders: _founders,
      onSubmit: (draft) async {
        final thread = await api.startOwnerThread(
          recipientUserId: draft.recipientUserId,
          title: draft.title,
          body: draft.body,
        );
        if (mounted) {
          setState(() => _items = prependInboxThread(_items, thread));
        }
        final id = thread['id'];
        return id is String ? id : null;
      },
    );
    if (!mounted || threadId == null || threadId.isEmpty) return;
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Founder messages',
      fallbackRoute: '/settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : FounderInboxMessages(
              isOwner: _owner,
              items: _items,
              error: _error,
              onMessage: _messageFounder,
              onOpen: (item) =>
                  context.push('/settings/founder-inbox/${item['id']}'),
            ),
    );
  }
}

class FounderInboxThreadScreen extends ConsumerStatefulWidget {
  const FounderInboxThreadScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<FounderInboxThreadScreen> createState() =>
      _FounderInboxThreadScreenState();
}

class _FounderInboxThreadScreenState
    extends ConsumerState<FounderInboxThreadScreen> {
  Map<String, dynamic>? _item;
  final _reply = TextEditingController();
  final _note = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reply.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final item = await FounderHubApi(
        ref.read(nestApiSessionProvider),
      ).inboxThread(widget.id);
      if (mounted) setState(() => _item = item);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = _item;
    final messages = item?['messages'];
    return FeatureScaffold(
      title: item?['title'] as String? ?? 'Message',
      fallbackRoute: '/settings/founder-inbox',
      body: item == null
          ? Center(child: Text(_error ?? 'Loading…'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('${item['statusLabel']}'),
                const SizedBox(height: 12),
                if (messages is List)
                  for (final message in messages.whereType<Map>())
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('${message['kind']}: ${message['body']}'),
                    ),
                if (_error != null)
                  Text(
                    _error!,
                    style: const TextStyle(color: DayPilotColors.error),
                  ),
                TextField(
                  controller: _reply,
                  decoration: const InputDecoration(labelText: 'Reply'),
                ),
                FilledButton(
                  onPressed: () async {
                    try {
                      final next = await FounderHubApi(
                        ref.read(nestApiSessionProvider),
                      ).inboxReply(widget.id, _reply.text.trim());
                      if (mounted) {
                        setState(() => _item = next);
                        _reply.clear();
                      }
                    } catch (e) {
                      if (mounted) setState(() => _error = '$e');
                    }
                  },
                  child: const Text('Reply'),
                ),
                TextField(
                  controller: _note,
                  decoration: const InputDecoration(
                    labelText: 'Internal note. Founders never see this.',
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    try {
                      final next = await FounderHubApi(
                        ref.read(nestApiSessionProvider),
                      ).inboxNote(widget.id, _note.text.trim());
                      if (mounted) {
                        setState(() => _item = next);
                        _note.clear();
                      }
                    } catch (e) {
                      if (mounted) setState(() => _error = '$e');
                    }
                  },
                  child: const Text('Save internal note'),
                ),
              ],
            ),
    );
  }
}
