import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';

final todayBriefProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final today = DateTime.now().toIso8601String().substring(0, 10);
  return client
      .from('pilot_briefs')
      .select('id, brief_date, content, created_at, updated_at')
      .eq('brief_date', today)
      .maybeSingle();
});

/// Pilot Brief — same data as web (pilot_briefs + Edge Function).
class DailyBriefScreen extends ConsumerStatefulWidget {
  const DailyBriefScreen({super.key});

  @override
  ConsumerState<DailyBriefScreen> createState() => _DailyBriefScreenState();
}

class _DailyBriefScreenState extends ConsumerState<DailyBriefScreen> {
  final _askCtrl = TextEditingController();
  bool _generating = false;

  @override
  void dispose() {
    _askCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    setState(() => _generating = true);
    try {
      final client = ref.read(supabaseClientProvider);
      final session = client.auth.currentSession;
      if (session == null) throw Exception('Not signed in');
      final res = await http.post(
        Uri.parse('${DayPilotEnv.supabaseUrl}/functions/v1/pilot-brief'),
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'apikey': DayPilotEnv.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: '{}',
      );
      final payload = jsonDecode(res.body.isEmpty ? '{}' : res.body);
      if (res.statusCode >= 400) {
        throw Exception(
          (payload is Map ? payload['error'] : null) ??
              'Failed to generate Pilot Brief',
        );
      }
      ref.invalidate(todayBriefProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final snap = ref.watch(todayBriefProvider);
    return Scaffold(
      backgroundColor: DayPilotScheme.of(context).backgroundPrimary,
      appBar: AppBar(
        title: Text('Pilot Brief'),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/insights');
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: _generating ? null : _generate,
            child: Text(_generating ? 'Generating…' : 'Regenerate'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                children: [
                  Center(
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color:
                                DayPilotScheme.of(context).accent.withValues(alpha: 0.35),
                            blurRadius: 28,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/branding/logo_mark.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  snap.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Text(
                      '$e',
                      style: TextStyle(color: DayPilotColors.error),
                    ),
                    data: (brief) {
                      final content = brief?['content'];
                      final map = content is Map
                          ? Map<String, dynamic>.from(content)
                          : null;
                      if (map == null) {
                        return Column(
                          children: [
                            Text(
                              'No brief for today yet. Generate one from your schedule and tasks.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: DayPilotScheme.of(context).textSecondary,
                              ),
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: _generating ? null : _generate,
                              child: Text(
                                _generating
                                    ? 'Generating…'
                                    : 'Generate Pilot Brief',
                              ),
                            ),
                          ],
                        );
                      }
                      final suggestions =
                          (map['suggestions'] as List?)?.cast<Object?>() ?? [];
                      final conflicts =
                          (map['conflicts'] as List?)?.cast<Object?>() ?? [];
                      final focus =
                          (map['focus_windows'] as List?)?.cast<Object?>() ??
                              [];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${map['summary'] ?? 'Your day at a glance'}',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  height: 1.4,
                                ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${map['events_today'] ?? 0} events today · '
                            '${map['tasks_due'] ?? 0} tasks due · '
                            '${map['tasks_overdue'] ?? 0} overdue',
                            style: TextStyle(
                              color: DayPilotScheme.of(context).textSecondary,
                            ),
                          ),
                          if (suggestions.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            _section('Suggestions', suggestions),
                          ],
                          if (conflicts.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _section('Conflicts', conflicts),
                          ],
                          if (focus.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _section('Focus windows', focus),
                          ],
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _askCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Ask me anything…',
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) {
                        _askCtrl.clear();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Chat is coming soon — use Regenerate for a fresh brief',
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: () {
                      _askCtrl.clear();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Chat is coming soon — use Regenerate for a fresh brief',
                          ),
                        ),
                      );
                    },
                    icon: Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Object?> items) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: DayPilotScheme.of(context).textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                '• $item',
                style: TextStyle(
                  color: DayPilotScheme.of(context).textSecondary,
                  height: 1.35,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
