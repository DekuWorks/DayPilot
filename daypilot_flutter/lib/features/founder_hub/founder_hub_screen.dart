import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/dp_cards.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';
import 'founder_owner_message.dart';

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

  FounderHubApi get _api => FounderHubApi(ref.read(nestApiSessionProvider));

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
    final canRead = summary?['canRead'] == true;
    final replies = (summary?['unreadReplyCount'] as num?)?.toInt() ?? 0;
    final threads = threadsForFounderHub(_items);
    return FeatureScaffold(
      title: 'Founder Hub',
      fallbackRoute: '/settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: DpCard(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: DayPilotColors.error),
                      ),
                    ),
                  ),
                if (summary != null && !canRead)
                  DpCard(
                    child: Row(
                      children: [
                        DpIconTile(
                          icon: Icons.lock_outline_rounded,
                          tint: colors.textTertiary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Founder Hub is available to founding members.',
                            style: TextStyle(color: colors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (canRead) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      DpPill(
                        label:
                            '${summary?['label'] ?? 'Founding Member'}'
                            '${summary?['phase'] == 'expired' ? ' · read only' : ''}',
                        tint: colors.accent,
                      ),
                      if (replies > 0)
                        DpPill(
                          label:
                              '$replies unread ${replies == 1 ? 'reply' : 'replies'}',
                          tint: DayPilotColors.warning,
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const DpSectionTitle(title: 'Early access'),
                  const SizedBox(height: 8),
                  if (_beta.isEmpty)
                    DpCard(
                      child: Text(
                        'No founder beta features are available right now.',
                        style: TextStyle(color: colors.textSecondary),
                      ),
                    ),
                  for (final feature in _beta)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _BetaTile(
                        feature: feature,
                        canWrite: summary?['canWrite'] == true,
                        onFeedback: () {
                          setState(() {
                            _title.text = '${feature['name']}';
                            _description.text =
                                'Feedback on ${feature['name']}.';
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
                    ),
                  const SizedBox(height: 14),
                  const DpSectionTitle(title: 'Your suggestions'),
                  const SizedBox(height: 8),
                  if (threads.isEmpty)
                    DpCard(
                      child: Text(
                        'You have not sent a suggestion yet.',
                        style: TextStyle(color: colors.textSecondary),
                      ),
                    ),
                  for (final item in threads)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DpCard(
                        onTap: () =>
                            context.push('/settings/founder-hub/${item['id']}'),
                        child: Row(
                          children: [
                            DpIconTile(
                              icon: Icons.lightbulb_outline_rounded,
                              tint: colors.accent,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${item['title']}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: colors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    hubThreadSubtitle(item),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (item['unread'] == true)
                              const DpPill(
                                label: 'Unread',
                                tint: DayPilotColors.warning,
                              ),
                            Icon(
                              Icons.chevron_right_rounded,
                              color: colors.textTertiary,
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (summary?['canWrite'] == true) ...[
                    const SizedBox(height: 14),
                    const DpSectionTitle(title: 'Submit a suggestion'),
                    const SizedBox(height: 8),
                    DpCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _title,
                            decoration: const InputDecoration(
                              labelText: 'Title',
                            ),
                          ),
                          TextField(
                            controller: _description,
                            minLines: 3,
                            maxLines: 6,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                            ),
                          ),
                          const SizedBox(height: 8),
                          DropdownButton<String>(
                            value: _category,
                            items: [
                              for (final item in _categories)
                                DropdownMenuItem(
                                  value: item.$1,
                                  child: Text(item.$2),
                                ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _category = value);
                              }
                            },
                          ),
                          TextButton(
                            onPressed: () async {
                              final picked = await ImagePicker().pickImage(
                                source: ImageSource.gallery,
                                imageQuality: 80,
                              );
                              if (picked != null) {
                                setState(() => _shot = picked);
                              }
                            },
                            child: Text(
                              _shot == null ? 'Add screenshot' : _shot!.name,
                            ),
                          ),
                          FilledButton(
                            onPressed: _busy ? null : _submit,
                            child: Text(_busy ? 'Sending…' : 'Submit'),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (_prefs != null) ...[
                    const SizedBox(height: 14),
                    const DpSectionTitle(title: 'Hub notifications'),
                    const SizedBox(height: 8),
                    DpCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      child: Column(
                        children: [
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
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                'Email stays off until you turn it on.',
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
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
    required this.canWrite,
    required this.onFeedback,
    this.onOpt,
  });

  final Map<String, dynamic> feature;
  final bool canWrite;
  final VoidCallback onFeedback;
  final VoidCallback? onOpt;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final label = feature['label'] as String?;
    return DpCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              DpIconTile(
                icon: Icons.rocket_launch_outlined,
                tint: colors.accent,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '${feature['name']}',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: colors.textPrimary,
                  ),
                ),
              ),
              if (label != null && label.isNotEmpty)
                DpPill(label: label, tint: colors.accent),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${feature['description']}',
            style: TextStyle(color: colors.textSecondary, fontSize: 13),
          ),
          Wrap(
            children: [
              if (canWrite)
                TextButton(
                  onPressed: onFeedback,
                  child: const Text('Send feedback'),
                ),
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
        ],
      ),
    );
  }
}

class FounderThreadScreen extends ConsumerStatefulWidget {
  const FounderThreadScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<FounderThreadScreen> createState() =>
      _FounderThreadScreenState();
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
      final item = await FounderHubApi(
        ref.read(nestApiSessionProvider),
      ).suggestion(widget.id);
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
                for (final message in founderVisibleMessages(messages))
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
                  Text(
                    _error!,
                    style: const TextStyle(color: DayPilotColors.error),
                  ),
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
