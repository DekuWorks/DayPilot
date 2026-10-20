import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'founder_hub_api.dart';
import 'founder_owner_message.dart';

/// Short copy for a failed people load or waitlist update.
/// Callers must not interpolate the exception: it can contain a file path or SQL.
String founderPeopleErrorMessage({required bool updating}) {
  return updating
      ? 'Could not update that request.'
      : 'Could not load people.';
}

/// Owner-only list of founding subscribers and waitlist rows.
/// The screen is routed only from controls that already checked `isOwner`.
/// The API rejects everyone else with 403.
class FounderPeopleScreen extends ConsumerStatefulWidget {
  const FounderPeopleScreen({super.key});

  @override
  ConsumerState<FounderPeopleScreen> createState() =>
      _FounderPeopleScreenState();
}

class _FounderPeopleScreenState extends ConsumerState<FounderPeopleScreen> {
  bool _loading = true;
  bool _owner = false;
  String? _error;
  List<Map<String, dynamic>> _founding = const [];
  List<Map<String, dynamic>> _waitlist = const [];
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = FounderHubApi(ref.read(nestApiSessionProvider));
      final account = await api.account();
      final hub = account['founderHub'];
      if (hub is! Map || hub['isOwner'] != true) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _owner = false;
          _founding = const [];
          _waitlist = const [];
          _error = 'Only the hub owner can open this.';
        });
        return;
      }
      final people = await api.people();
      if (!mounted) return;
      setState(() {
        _owner = true;
        _founding = _maps(people['founding']);
        _waitlist = _maps(people['waitlist']);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _owner = false;
        _founding = const [];
        _waitlist = const [];
        _error = founderPeopleErrorMessage(updating: false);
      });
    }
  }

  List<Map<String, dynamic>> _maps(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  Future<void> _setStatus(String id, String status) async {
    setState(() => _busyId = id);
    try {
      await FounderHubApi(
        ref.read(nestApiSessionProvider),
      ).setWaitlistStatus(id, status);
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() => _error = founderPeopleErrorMessage(updating: true));
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  String _when(Object? value) {
    if (value is! String || value.isEmpty) return '—';
    return value.length >= 16
        ? value.substring(0, 16).replaceFirst('T', ' ')
        : value;
  }

  String _spot(Object? value) {
    if (value is! num) return '—';
    return '#${value.toInt().toString().padLeft(2, '0')}';
  }

  Future<void> _messageFounder({String? userId}) async {
    final founders = messageableFounders(_founding);
    if (userId == null &&
        !showStartThreadControl(isOwner: _owner, founders: founders)) {
      return;
    }
    final threadId = await showOwnerMessageDialog(
      context: context,
      founders: founders,
      recipientUserId: userId,
      onSubmit: (draft) async {
        final thread = await FounderHubApi(ref.read(nestApiSessionProvider))
            .startOwnerThread(
              recipientUserId: draft.recipientUserId,
              title: draft.title,
              body: draft.body,
            );
        final id = thread['id'];
        return id is String ? id : null;
      },
    );
    if (!mounted || threadId == null || threadId.isEmpty) return;
    context.push('/settings/founder-inbox/$threadId');
  }

  @override
  Widget build(BuildContext context) {
    final secondary = DayPilotScheme.of(context).textSecondary;
    return FeatureScaffold(
      title: 'People',
      fallbackRoute: '/settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Founding subscribers and waitlist requests. Only the hub owner can open this.',
                  style: TextStyle(color: secondary, height: 1.35),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: const TextStyle(color: DayPilotColors.error),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Founding subscribers (${_founding.length})',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                MessageFounderButton(
                  isOwner: _owner,
                  founders: messageableFounders(_founding),
                  onPressed: _messageFounder,
                ),
                if (_founding.isNotEmpty &&
                    messageableFounders(_founding).isEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'No founding members with open access.',
                    style: TextStyle(color: secondary),
                  ),
                ],
                const SizedBox(height: 8),
                if (_founding.isEmpty)
                  Text(
                    'No founding subscribers stored yet.',
                    style: TextStyle(color: secondary),
                  )
                else
                  for (final person in _founding)
                    _Card(
                      title:
                          '${person['name'] ?? person['email'] ?? 'Unlinked spot'} ${_spot(person['founderNumber'])}',
                      lines: [
                        '${person['email'] ?? 'No email'} · ${person['plan']} · ${person['status'] ?? 'claim'}',
                        'Claimed ${_when(person['claimCreatedAt'])}',
                        'Subscribed ${_when(person['subscribedAt'])}',
                        'Access until ${_when(person['currentPeriodEnd'])}',
                      ],
                      action: messageableFounders([person]).isEmpty
                          ? null
                          : TextButton(
                              onPressed: () => _messageFounder(
                                userId: person['userId'] as String,
                              ),
                              child: const Text('Message founder'),
                            ),
                    ),
                const SizedBox(height: 16),
                Text(
                  'Waitlist (${_waitlist.length})',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                if (_waitlist.isEmpty)
                  Text(
                    'No waitlist requests stored yet.',
                    style: TextStyle(color: secondary),
                  )
                else
                  for (final row in _waitlist)
                    _WaitlistCard(
                      row: row,
                      when: _when(row['createdAt']),
                      busy: _busyId == row['id'],
                      onStatus: (status) => _setStatus('${row['id']}', status),
                    ),
              ],
            ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.lines, this.action});

  final String title;
  final List<String> lines;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final secondary = DayPilotScheme.of(context).textSecondary;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          for (final line in lines)
            Text(line, style: TextStyle(color: secondary, height: 1.35)),
          ?action,
        ],
      ),
    );
  }
}

class _WaitlistCard extends StatelessWidget {
  const _WaitlistCard({
    required this.row,
    required this.when,
    required this.busy,
    required this.onStatus,
  });

  final Map<String, dynamic> row;
  final String when;
  final bool busy;
  final ValueChanged<String> onStatus;

  @override
  Widget build(BuildContext context) {
    final secondary = DayPilotScheme.of(context).textSecondary;
    final status = '${row['status'] ?? 'open'}';
    final company = row['companyName'];
    final size = row['teamSize'];
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${row['email']}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          Text(
            '${row['plan']} · $status · $when',
            style: TextStyle(color: secondary),
          ),
          if (company != null || size != null)
            Text(
              '${company ?? 'No company'}${size != null ? ' · team size $size' : ''}',
              style: TextStyle(color: secondary),
            ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              if (status != 'handled')
                FilledButton(
                  onPressed: busy ? null : () => onStatus('handled'),
                  child: const Text('Mark handled'),
                )
              else
                OutlinedButton(
                  onPressed: busy ? null : () => onStatus('open'),
                  child: const Text('Mark open'),
                ),
              if (status != 'removed')
                OutlinedButton(
                  onPressed: busy ? null : () => onStatus('removed'),
                  child: const Text('Remove'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
