import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../tasks/tasks_screen.dart';
import 'insight_load_error.dart';
import 'insights_providers.dart';

final _focusSessionsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final from =
      DateTime.now().subtract(const Duration(days: 7)).toIso8601String();
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
    await ref.read(supabaseClientProvider).from('focus_sessions').update({
      'status': 'completed',
      'ended_at': ended.toIso8601String(),
      'duration_seconds': secs,
    }).eq('id', id);
    ref.invalidate(_activeFocusProvider);
    ref.invalidate(_focusSessionsProvider);
  }

  String _formatFocus(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    if (h == 0) return '${m}m';
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  List<double> _weekSeries(List<Map<String, dynamic>> rows) {
    final now = DateTime.now();
    final series = List<double>.filled(7, 0);
    for (final r in rows) {
      if (r['status'] != 'completed') continue;
      final started = DateTime.tryParse('${r['started_at']}');
      if (started == null) continue;
      final day = DateTime(started.year, started.month, started.day);
      final today = DateTime(now.year, now.month, now.day);
      final idx = 6 - today.difference(day).inDays;
      if (idx < 0 || idx > 6) continue;
      series[idx] += ((r['duration_seconds'] as int?) ?? 0) / 60.0;
    }
    return series;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(latestInsightProvider);
    final focus = ref.watch(_focusSessionsProvider);
    final active = ref.watch(_activeFocusProvider);
    final tasks = ref.watch(tasksListProvider);

    final weekSeconds = focus.maybeWhen(
      data: (rows) => rows
          .where((r) => r['status'] == 'completed')
          .fold<int>(0, (a, r) => a + ((r['duration_seconds'] as int?) ?? 0)),
      orElse: () => 0,
    );
    final series = focus.maybeWhen(
      data: _weekSeries,
      orElse: () => List<double>.filled(7, 0),
    );
    final completedTasks = tasks.maybeWhen(
      data: (list) => list.where((t) => t.isDone).length,
      orElse: () => 0,
    );

    return Scaffold(
      backgroundColor: DayPilotScheme.of(context).backgroundPrimary,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Insights',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: DayPilotScheme.of(context).textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Focus time and weekly rhythm',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: DayPilotScheme.of(context).textSecondary,
                  ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/insights/brief'),
              icon: const Icon(Icons.auto_awesome_rounded, size: 18),
              label: const Text('Open Pilot Brief'),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: DayPilotScheme.of(context).surfacePrimary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Focus Time',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).textSecondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatFocus(weekSeconds),
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      color: DayPilotScheme.of(context).textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This week',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).accent,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 72,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _SparklinePainter(
                        values: series,
                        color: DayPilotScheme.of(context).accent,
                      ),
                    ),
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
                final meetings = insight?.metrics['upcoming_event_count'] ?? 0;
                return Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Meetings',
                        value: '$meetings',
                        hint: 'next 7 days',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatCard(
                        label: 'Tasks completed',
                        value: '$completedTasks',
                        hint: 'open list',
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: DayPilotScheme.of(context).surfacePrimary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Focus timer',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  active.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('$e'),
                    data: (session) {
                      if (session == null) {
                        return FilledButton.icon(
                          onPressed: () => _startFocus(ref),
                          icon: Icon(Icons.play_arrow_rounded),
                          label: Text('Start focus'),
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
                              style: TextStyle(
                                color: DayPilotScheme.of(context).accent,
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
                            child: Text('Stop'),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => context.push('/insights/brief'),
              icon: Icon(Icons.auto_awesome_rounded),
              label: Text('Open Pilot Brief'),
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
    required this.hint,
  });

  final String label;
  final String value;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: DayPilotScheme.of(context).textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: DayPilotScheme.of(context).textPrimary,
              fontSize: 28,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            hint,
            style: TextStyle(
              color: DayPilotScheme.of(context).textTertiary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxV = values.reduce(math.max).clamp(1.0, double.infinity);
    final minV = values.reduce(math.min);
    final range = (maxV - minV).clamp(1.0, double.infinity);
    final dx = size.width / (values.length - 1).clamp(1, 999);

    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = i * dx;
      final y = size.height - ((values[i] - minV) / range) * (size.height - 8) - 4;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final fill = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      fill,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            color.withValues(alpha: 0.28),
            color.withValues(alpha: 0.0),
          ],
        ).createShader(Offset.zero & size),
    );

    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.color != color;
  }
}
