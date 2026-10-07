import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';

const _categories = <(String, String)>[
  ('feature_idea', 'Feature Idea'),
  ('improvement', 'Improvement'),
  ('bug', 'Bug'),
  ('integration', 'Integration'),
  ('other', 'Other'),
];

class FounderHubScreen extends ConsumerStatefulWidget {
  const FounderHubScreen({super.key});

  @override
  ConsumerState<FounderHubScreen> createState() => _FounderHubScreenState();
}

class _FounderHubScreenState extends ConsumerState<FounderHubScreen> {
  Map<String, dynamic>? _summary;
  List<Map<String, dynamic>> _items = const [];
  List<Map<String, dynamic>> _beta = const [];
  Map<String, dynamic>? _prefs;
  final _title = TextEditingController();
  final _description = TextEditingController();
  String _category = 'feature_idea';
  XFile? _shot;
  String? _error;
  bool _loading = true;
  bool _busy = false;

  FounderHubApi get _api =>
      FounderHubApi(ref.read(nestApiSessionProvider));

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final summary = await _api.summary();
      List<Map<String, dynamic>> items = const [];
      List<Map<String, dynamic>> beta = const [];
      Map<String, dynamic>? prefs;
      if (summary['canRead'] == true) {
        items = await _api.suggestions();
        beta = await _api.beta();
        prefs = await _api.prefs();
      }
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _items = items;
        _beta = beta;
        _prefs = prefs;
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

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await _api.createSuggestion(
        title: _title.text.trim(),
        description: _description.text.trim(),
        category: _category,
      );
      final suggestion = created['suggestion'];
      final id = suggestion is Map ? suggestion['id'] as String? : null;
      final shot = _shot;
      if (id != null && shot != null) {
        final bytes = await shot.readAsBytes();
        await _api.uploadScreenshot(
          id: id,
          fileName: shot.name,
          mimeType: shot.mimeType ?? 'image/jpeg',
          dataBase64: base64Encode(bytes),
        );
      }
      _title.clear();
      _description.clear();
      _shot = null;
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final summary = _summary;
    return FeatureScaffold(
      title: 'Founder Hub',
      fallbackRoute: '/settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
                if (summary != null && summary['canRead'] != true)
                  const Text('Founder Hub is available to founding members.'),
                if (summary?['canRead'] == true) ...[
                  Text(
                    '${summary?['label'] ?? 'Founding Member'}'
                    '${summary?['phase'] == 'expired' ? ' · read only' : ''}',
                    style: TextStyle(color: colors.textSecondary),
                  ),
                  if ((summary?['unreadReplyCount'] as num?) != null &&
                      (summary?['unreadReplyCount'] as num) > 0)
                    Text('${summary!['unreadReplyCount']} unread replies'),
                  const SizedBox(height: 16),
                  if (summary?['canWrite'] == true) ...[
                    const Text('Submit a suggestion'),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _title,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    TextField(
                      controller: _description,
                      minLines: 3,
                      maxLines: 6,
                      decoration: const InputDecoration(labelText: 'Description'),
                    ),
                    DropdownButton<String>(
                      value: _category,
                      items: [
                        for (final item in _categories)
                          DropdownMenuItem(value: item.$1, child: Text(item.$2)),
                      ],
                      onChanged: (value) {
                        if (value != null) setState(() => _category = value);
                      },
                    ),
                    TextButton(
                      onPressed: () async {
                        final picked = await ImagePicker().pickImage(
                          source: ImageSource.gallery,
                          imageQuality: 80,
                        );
                        if (picked != null) setState(() => _shot = picked);
                      },
                      child: Text(_shot == null ? 'Add screenshot' : _shot!.name),
                    ),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: Text(_busy ? 'Sending…' : 'Submit'),
                    ),
                  ],
                  const SizedBox(height: 20),
                  const Text('My suggestions'),
                  for (final item in _items)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${item['title']}'),
                      subtitle: Text(
                        '${item['categoryLabel']} · ${item['statusLabel']}'
                        '${item['unread'] == true ? ' · unread' : ''}',
                      ),
                      onTap: () => context.push('/settings/founder-hub/${item['id']}'),
                    ),
                  const SizedBox(height: 20),
                  const Text('Early access'),
                  if (_beta.isEmpty)
                    Text(
                      'No founder beta features are available right now.',
                      style: TextStyle(color: colors.textSecondary),
                    ),
                  for (final feature in _beta)
                    _BetaTile(
                      feature: feature,
                      onFeedback: () {
                        setState(() {
                          _title.text = '${feature['name']}';
                          _description.text = 'Feedback on ${feature['name']}.';
                          _category = 'improvement';
                        });
                      },
                      onOpt: feature['changesScheduling'] == true
                          ? () async {
                              final next = await _api.setOptOut(
                                '${feature['key']}',
                                feature['optedOut'] != true,
                              );
                              if (mounted) setState(() => _beta = next);
                            }
                          : null,
                    ),
                  if (_prefs != null) ...[
                    const SizedBox(height: 20),
                    const Text('Hub notifications'),
                    for (final entry in const [
                      ('inApp', 'In the app'),
                      ('push', 'Phone alerts'),
                      ('email', 'Email'),
                    ])
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(entry.$2),
                        value: _prefs![entry.$1] == true,
                        onChanged: (value) async {
                          final next = {..._prefs!, entry.$1: value};
                          setState(() => _prefs = next);
                          await _api.savePrefs(next);
                        },
                      ),
                    Text(
                      'Email stays off until you turn it on.',
                      style: TextStyle(color: colors.textSecondary, fontSize: 12),
                    ),
                  ],
                ],
              ],
            ),
    );
  }
}

class _BetaTile extends StatelessWidget {
  const _BetaTile({
    required this.feature,
    required this.onFeedback,
    this.onOpt,
  });

  final Map<String, dynamic> feature;
  final VoidCallback onFeedback;
  final VoidCallback? onOpt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${feature['name']}${feature['label'] == null ? '' : ' · ${feature['label']}'}'),
          Text('${feature['description']}'),
          TextButton(onPressed: onFeedback, child: const Text('Send feedback')),
          if (onOpt != null)
            TextButton(
              onPressed: onOpt,
              child: Text(
                feature['optedOut'] == true
                    ? 'Use this beta behaviour'
                    : 'Turn off this beta behaviour',
              ),
            ),
        ],
      ),
    );
  }
}

class FounderThreadScreen extends ConsumerStatefulWidget {
  const FounderThreadScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<FounderThreadScreen> createState() => _FounderThreadScreenState();
}

class _FounderThreadScreenState extends ConsumerState<FounderThreadScreen> {
  Map<String, dynamic>? _item;
  final _body = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final item = await FounderHubApi(ref.read(nestApiSessionProvider))
          .suggestion(widget.id);
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
      title: item?['title'] as String? ?? 'Suggestion',
      fallbackRoute: '/settings/founder-hub',
      body: item == null
          ? Center(child: Text(_error ?? 'Loading…'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('${item['categoryLabel']} · ${item['statusLabel']}'),
                const SizedBox(height: 12),
                if (messages is List)
                  for (final message in messages.whereType<Map>())
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('${message['body']}'),
                    ),
                TextField(
                  controller: _body,
                  minLines: 2,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Follow up'),
                ),
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
                FilledButton(
                  onPressed: () async {
                    try {
                      final next = await FounderHubApi(
                        ref.read(nestApiSessionProvider),
                      ).reply(widget.id, _body.text.trim());
                      final suggestion = next['suggestion'];
                      if (suggestion is Map && mounted) {
                        setState(() {
                          _item = Map<String, dynamic>.from(suggestion);
                          _error = null;
                        });
                        _body.clear();
                      }
                    } catch (e) {
                      if (mounted) setState(() => _error = '$e');
                    }
                  },
                  child: const Text('Send'),
                ),
              ],
            ),
    );
  }
}
