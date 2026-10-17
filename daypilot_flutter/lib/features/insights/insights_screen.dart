import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/dp_cards.dart';
import '../tasks/tasks_screen.dart';
import 'insight_load_error.dart';
import 'insights_providers.dart';

final _focusSessionsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final from = DateTime.now()
          .subtract(const Duration(days: 7))
          .toIso8601String();
      final rows = await ref
          .watch(supabaseClientProvider)
          .from('focus_sessions')
          .select('id, started_at, ended_at, duration_seconds, status')
          .gte('started_at', from)
          .order('started_at', ascending: false)
          .limit(50);
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    });

final _activeFocusProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((
  ref,
) async {
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
    await client
        .from('focus_sessions')
        .update({
          'status': 'cancelled',
          'ended_at': DateTime.now().toIso8601String(),
        })
        .eq('user_id', uid)
        .eq('status', 'active');
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
    await ref
        .read(supabaseClientProvider)
        .from('focus_sessions')
        .update({
          'status': 'completed',
          'ended_at': ended.toIso8601String(),
          'duration_seconds': secs,
        })
        .eq('id', id);
    ref.invalidate(_activeFocusProvider);
    ref.invalidate(_focusSessionsProvider);
  }

  String _formatFocus(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    if (h == 0) return '${m}m';
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.dp;
    final snap = ref.watch(latestInsightProvider);
    final focus = ref.watch(_focusSessionsProvider);
    final active = ref.watch(_activeFocusProvider);
    final tasks = ref.watch(tasksListProvider);
    final now = DateTime.now();

    final weekSeconds = focus.maybeWhen(
      data: (rows) => rows
          .where((r) => r['status'] == 'completed')
          .fold<int>(0, (a, r) => a + ((r['duration_seconds'] as int?) ?? 0)),
      orElse: () => 0,
    );
    final series = focus.maybeWhen(
      data: (rows) => focusMinutesByDay(rows, now),
      orElse: () => List<double>.filled(7, 0),
    );
    final completedLastWeek = tasks.maybeWhen(
      data: (list) => completedInLastDays(list, now, 7),
      orElse: () => 0,
    );

    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Insights',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: colors.textPrimary,
                        ),
                      ),
                      Text(
                        'Focus time and weekly rhythm',
                        style: TextStyle(
                          fontSize: 13,
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => context.push('/insights/brief'),
                  icon: const Icon(Icons.auto_awesome_rounded, size: 18),
                  label: const Text('Pilot Brief'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            DpCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Focus time, last 7 days',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (focus.hasError)
                    Text(
                      'Unavailable',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: colors.textTertiary,
                      ),
                    )
                  else if (focus.isLoading)
                    const LinearProgressIndicator()
                  else ...[
                    Text(
                      weekSeconds == 0 ? 'None yet' : _formatFocus(weekSeconds),
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: colors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _WeekBars(values: series, now: now),
                    if (weekSeconds == 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Complete a focus session below and it shows here.',
                          style: TextStyle(
                            fontSize: 12,
                            color: colors.textSecondary,
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: snap.when(
                    loading: () => const _StatCard(
                      label: 'Meetings',
                      value: '…',
                      hint: 'next 7 days',
                    ),
                    error: (_, _) => const _StatCard(
                      label: 'Meetings',
                      value: 'Unavailable',
                      hint: 'next 7 days',
                      muted: true,
                    ),
                    data: (insight) {
                      final n = insight?.metrics['upcoming_event_count'];
                      return _StatCard(
                        label: 'Meetings',
                        value: n == null ? 'Unavailable' : '$n',
                        hint: 'next 7 days',
                        muted: n == null,
                      );
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: tasks.when(
                    loading: () => const _StatCard(
                      label: 'Tasks completed',
                      value: '…',
                      hint: 'last 7 days',
                    ),
                    error: (_, _) => const _StatCard(
                      label: 'Tasks completed',
                      value: 'Unavailable',
                      hint: 'last 7 days',
                      muted: true,
                    ),
                    data: (_) => _StatCard(
                      label: 'Tasks completed',
                      value: '$completedLastWeek',
                      hint: 'last 7 days',
                    ),
                  ),
                ),
              ],
            ),
            if (snap.hasError) ...[
              const SizedBox(height: 12),
              InsightLoadError(
                error: snap.error!,
                title: 'Could not load the meeting count',
              ),
            ],
            const SizedBox(height: 12),
            DpCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const DpSectionTitle(title: 'Focus timer'),
                  const SizedBox(height: 4),
                  active.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text(
                      'Unavailable. The focus timer could not be loaded.',
                      style: TextStyle(color: colors.textSecondary),
                    ),
                    data: (session) {
                      if (session == null) {
                        return FilledButton.icon(
                          onPressed: () => _startFocus(ref),
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Start focus'),
                        );
                      }
                      final started =
                          DateTime.tryParse('${session['started_at']}') ??
                          DateTime.now();
                      return Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Focusing since ${TimeOfDay.fromDateTime(started.toLocal()).format(context)}',
                              style: TextStyle(
                                color: colors.accent,
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
          ],
        ),
      ),
    );
  }
}

/// Completed focus minutes for each of the last seven days, oldest first.
/// The last entry is today. Only completed sessions count.
List<double> focusMinutesByDay(List<Map<String, dynamic>> rows, DateTime now) {
  final series = List<double>.filled(7, 0);
  final today = DateTime(now.year, now.month, now.day);
  for (final r in rows) {
    if (r['status'] != 'completed') continue;
    final started = DateTime.tryParse('${r['started_at']}')?.toLocal();
    if (started == null) continue;
    final day = DateTime(started.year, started.month, started.day);
    final idx = 6 - today.difference(day).inDays;
    if (idx < 0 || idx > 6) continue;
    series[idx] += ((r['duration_seconds'] as num?) ?? 0) / 60.0;
  }
  return series;
}

/// Tasks marked done within the last [days] days, by `completed_at`.
int completedInLastDays(List<TaskRow> tasks, DateTime now, int days) {
  final since = DateTime(
    now.year,
    now.month,
    now.day,
  ).subtract(Duration(days: days - 1));
  return tasks.where((t) {
    final c = t.completedAt?.toLocal();
    return t.isDone && c != null && !c.isBefore(since);
  }).length;
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.hint,
    this.muted = false,
  });

  final String label;
  final String value;
  final String hint;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Semantics(
      label: '$label: $value, $hint',
      excludeSemantics: true,
      child: DpCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: muted ? colors.textTertiary : colors.textPrimary,
                fontSize: muted ? 16 : 28,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              hint,
              style: TextStyle(
                color: colors.textTertiary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Seven bars of real focus minutes. The tallest bar is the week's maximum, so
/// the chart shows shape only; it never implies a goal or a trend.
class _WeekBars extends StatelessWidget {
  const _WeekBars({required this.values, required this.now});

  final List<double> values;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final maxV = values.fold<double>(0, (a, b) => b > a ? b : a);
    return SizedBox(
      height: 96,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < values.length; i++)
            Expanded(
              child: Semantics(
                label:
                    '${DateFormat('EEEE').format(now.subtract(Duration(days: 6 - i)))}: ${values[i].round()} minutes',
                excludeSemantics: true,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 5),
                      height: maxV == 0 ? 4 : 4 + (values[i] / maxV) * 60,
                      decoration: BoxDecoration(
                        color: values[i] == 0
                            ? colors.borderSubtle
                            : colors.accent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      DateFormat('E')
                          .format(now.subtract(Duration(days: 6 - i)))
                          .substring(0, 1),
                      style: TextStyle(
                        fontSize: 11,
                        color: colors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
