import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';

class FounderInboxScreen extends ConsumerStatefulWidget {
  const FounderInboxScreen({super.key});

  @override
  ConsumerState<FounderInboxScreen> createState() => _FounderInboxScreenState();
}

class _FounderInboxScreenState extends ConsumerState<FounderInboxScreen> {
  List<Map<String, dynamic>> _items = const [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final items = await FounderHubApi(ref.read(nestApiSessionProvider)).inbox();
      if (!mounted) return;
      setState(() {
        _items = items;
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

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Founder messages',
      fallbackRoute: '/settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
                if (_items.isEmpty && _error == null)
                  const Text('No founder messages.'),
                for (final item in _items)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      '${item['title']}${item['ownerUnread'] == true ? ' · unread' : ''}',
                    ),
                    subtitle: Text(
                      '${item['categoryLabel']} · ${item['statusLabel']}',
                    ),
                    onTap: () => context.push('/settings/founder-inbox/${item['id']}'),
                  ),
              ],
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
      final item =
          await FounderHubApi(ref.read(nestApiSessionProvider)).inboxThread(widget.id);
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
                  Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
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
