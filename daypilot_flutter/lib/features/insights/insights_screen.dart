import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import 'insight_load_error.dart';
import 'insights_providers.dart';

final _focusSessionsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final from = DateTime.now().subtract(const Duration(days: 7)).toIso8601String();
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('focus_sessions')
      .select('id, started_at, ended_at, duration_seconds, status')
      .gte('started_at', from)
      .order('started_at', ascending: false)
      .limit(50);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

final _activeFocusProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  return ref
      .watch(supabaseClientProvider)
      .from('focus_sessions')
      .select('id, started_at, status')
      .eq('status', 'active')
      .order('started_at', ascending: false)
      .limit(1)
      .maybeSingle();
});

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  Future<void> _startFocus(WidgetRef ref) async {
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    await client.from('focus_sessions').update({
      'status': 'cancelled',
      'ended_at': DateTime.now().toIso8601String(),
    }).eq('user_id', uid).eq('status', 'active');
    await client.from('focus_sessions').insert({
      'user_id': uid,
      'status': 'active',
      'started_at': DateTime.now().toIso8601String(),
    });
    ref.invalidate(_activeFocusProvider);
    ref.invalidate(_focusSessionsProvider);
  }

  Future<void> _stopFocus(WidgetRef ref, String id, DateTime started) async {
    final ended = DateTime.now();
    final secs = ended.difference(started).inSeconds.clamp(0, 86400);
    await ref.read(supabaseClientProvider).from('focus_sessions').update({
      'status': 'completed',
      'ended_at': ended.toIso8601String(),
      'duration_seconds': secs,
    }).eq('id', id);
    ref.invalidate(_activeFocusProvider);
    ref.invalidate(_focusSessionsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(latestInsightProvider);
    final focus = ref.watch(_focusSessionsProvider);
    final active = ref.watch(_activeFocusProvider);

    final weekSeconds = focus.maybeWhen(
      data: (rows) => rows
          .where((r) => r['status'] == 'completed')
          .fold<int>(0, (a, r) => a + ((r['duration_seconds'] as int?) ?? 0)),
      orElse: () => 0,
    );

    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text(
              'Insights',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: DayPilotColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Focus time and weekly rhythm',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: DayPilotColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: DayPilotColors.surfacePrimary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DayPilotColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Focus timer',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This week: ${(weekSeconds / 60).round()} min',
                    style: const TextStyle(color: DayPilotColors.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  active.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('$e'),
                    data: (session) {
                      if (session == null) {
                        return FilledButton.icon(
                          onPressed: () => _startFocus(ref),
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Start focus'),
                        );
                      }
                      final started = DateTime.tryParse(
                            '${session['started_at']}',
                          ) ??
                          DateTime.now();
                      return Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Focusing since ${TimeOfDay.fromDateTime(started.toLocal()).format(context)}',
                              style: const TextStyle(
                                color: DayPilotColors.brand500,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          FilledButton(
                            onPressed: () => _stopFocus(
                              ref,
                              session['id'] as String,
                              started,
                            ),
                            child: const Text('Stop'),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            snap.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => InsightLoadError(
                error: e,
                title: 'Could not load insights',
              ),
              data: (insight) {
                final upcoming =
                    insight?.metrics['upcoming_event_count'] ?? 0;
                return Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Meetings (7d)',
                        value: '$upcoming',
                        color: DayPilotColors.meetings,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatCard(
                        label: 'Focus (7d)',
                        value: '${(weekSeconds / 60).round()}m',
                        color: DayPilotColors.focus,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => context.push('/insights/brief'),
              icon: const Icon(Icons.auto_awesome_rounded),
              label: const Text('Open Pilot Brief'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotColors.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: DayPilotColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 28,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
