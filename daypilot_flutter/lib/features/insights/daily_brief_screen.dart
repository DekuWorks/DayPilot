import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/services/pilot_brief_api.dart';
import 'suggest_schedule_card.dart';

final todayBriefProvider = FutureProvider.autoDispose<PilotBrief?>((ref) {
  return getTodayBrief(ref.watch(supabaseClientProvider));
});

final todayChatProvider =
    FutureProvider.autoDispose<List<PilotChatMessage>>((ref) async {
  try {
    return await getTodayChat(ref.watch(supabaseClientProvider));
  } catch (_) {
    return const [];
  }
});

/// Pilot Brief — same `pilot_briefs` row + Edge Function as web.
class DailyBriefScreen extends ConsumerStatefulWidget {
  const DailyBriefScreen({super.key});

  @override
  ConsumerState<DailyBriefScreen> createState() => _DailyBriefScreenState();
}

class _DailyBriefScreenState extends ConsumerState<DailyBriefScreen> {
  final _askCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _generating = false;
  bool _asking = false;
  String? _error;
  PilotBrief? _generated;
  List<PilotChatMessage> _extraMessages = const [];

  @override
  void dispose() {
    _askCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final next = await generatePilotBrief(
        client: ref.read(supabaseClientProvider),
      );
      if (!mounted) return;
      setState(() => _generated = next);
      ref.invalidate(todayBriefProvider);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _ask(String raw) async {
    final message = raw.trim();
    if (message.isEmpty || _asking) return;
    _askCtrl.clear();
    setState(() {
      _asking = true;
      _error = null;
    });
    try {
      final result = await sendPilotBriefChat(
        client: ref.read(supabaseClientProvider),
        message: message,
      );
      if (!mounted) return;
      setState(() {
        _extraMessages = [..._extraMessages, result.userMessage, result.reply];
      });
      ref.invalidate(todayChatProvider);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_scrollCtrl.hasClients) return;
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      });
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  List<PilotChatMessage> _mergedChat(List<PilotChatMessage> loaded) {
    final seen = <String>{};
    final out = <PilotChatMessage>[];
    for (final m in [...loaded, ..._extraMessages]) {
      if (m.id.isEmpty || seen.add(m.id)) out.add(m);
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final snap = ref.watch(todayBriefProvider);
    final chatSnap = ref.watch(todayChatProvider);
    final brief = _generated ?? snap.asData?.value;
    final messages = _mergedChat(chatSnap.asData?.value ?? const []);
    PilotChatMessage? lastAssistant;
    for (final m in messages.reversed) {
      if (m.role == 'assistant') {
        lastAssistant = m;
        break;
      }
    }
    final chips = lastAssistant != null && lastAssistant.followUps.isNotEmpty
        ? lastAssistant.followUps
        : brief?.content.chips() ??
            const [
              'What should I tackle first?',
              'Where can I fit a focus block?',
              'Any conflicts I should fix?',
            ];

    return Scaffold(
      backgroundColor: DayPilotScheme.of(context).backgroundPrimary,
      appBar: AppBar(
        title: const Text('Pilot Brief'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
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
                controller: _scrollCtrl,
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
                            color: DayPilotScheme.of(context)
                                .accent
                                .withValues(alpha: 0.35),
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
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: DayPilotColors.error),
                      ),
                    ),
                  if (snap.isLoading && brief == null)
                    const Center(child: CircularProgressIndicator())
                  else if (snap.hasError && brief == null)
                    Text(
                      '${snap.error}',
                      style: const TextStyle(color: DayPilotColors.error),
                    )
                  else if (brief == null)
                    Column(
                      children: [
                        Text(
                          'No brief for today yet. Generate one from your schedule and tasks, or ask Pilot a question below.',
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
                    )
                  else
                    _BriefBody(
                      brief: brief,
                      onAsk: _ask,
                    ),
                  const SizedBox(height: 20),
                  const SuggestScheduleCard(),
                  const SizedBox(height: 20),
                  Text(
                    'Ask Pilot',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  if (messages.isEmpty && !_asking)
                    Text(
                      'Ask about meetings, tasks, conflicts, or where to focus. Pilot only uses today’s DayPilot data.',
                      style: TextStyle(
                        color: DayPilotScheme.of(context).textSecondary,
                      ),
                    ),
                  for (final m in messages) _ChatBubble(message: m),
                  if (_asking)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Pilot is thinking…',
                        style: TextStyle(
                          color: DayPilotScheme.of(context).textTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (chips.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final chip in chips)
                      ActionChip(
                        label: Text(chip),
                        onPressed: _asking ? null : () => _ask(chip),
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
                      enabled: !_asking,
                      decoration: const InputDecoration(
                        hintText: 'Ask about today…',
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: _asking ? null : _ask,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _asking ? null : () => _ask(_askCtrl.text),
                    icon: const Icon(Icons.send_rounded),
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

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final PilotChatMessage message;

  @override
  Widget build(BuildContext context) {
    final scheme = DayPilotScheme.of(context);
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: isUser ? scheme.accent : scheme.surfaceSecondary,
          borderRadius: BorderRadius.circular(12),
          border: isUser
              ? null
              : Border.all(color: scheme.borderSubtle),
        ),
        child: Text(
          message.content,
          style: TextStyle(
            color: isUser ? scheme.textInverse : scheme.textPrimary,
            height: 1.35,
          ),
        ),
      ),
    );
  }
}

class _BriefBody extends StatelessWidget {
  const _BriefBody({required this.brief, required this.onAsk});

  final PilotBrief brief;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final content = brief.content;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.summary.isEmpty
              ? 'Your day at a glance'
              : content.summary,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          '${content.eventsToday} events today · '
          '${content.tasksDue} tasks due · '
          '${content.tasksOverdue} overdue',
          style: TextStyle(
            color: DayPilotScheme.of(context).textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          content.isAi ? 'Source: AI + your data' : 'Source: rule-based fallback',
          style: TextStyle(
            fontSize: 12,
            color: DayPilotScheme.of(context).textTertiary,
          ),
        ),
        if (content.suggestions.isNotEmpty) ...[
          const SizedBox(height: 20),
          _section(
            context,
            'Suggestions',
            content.suggestions,
            (s) => onAsk('Tell me more: $s'),
          ),
        ],
        if (content.conflicts.isNotEmpty) ...[
          const SizedBox(height: 12),
          _section(
            context,
            'Conflicts',
            content.conflicts,
            (s) => onAsk('How should I resolve this: $s'),
          ),
        ],
        if (content.focusWindows.isNotEmpty) ...[
          const SizedBox(height: 12),
          _section(
            context,
            'Focus windows',
            content.focusWindows,
            (s) => onAsk('Help me use the $s focus window.'),
          ),
        ],
      ],
    );
  }

  Widget _section(
    BuildContext context,
    String title,
    List<String> items,
    ValueChanged<String> onPick,
  ) {
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
              child: InkWell(
                onTap: () => onPick(item),
                child: Text(
                  '• $item',
                  style: TextStyle(
                    color: DayPilotScheme.of(context).textSecondary,
                    height: 1.35,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
