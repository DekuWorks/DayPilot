import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/services/suggest_schedule_api.dart';
import '../../domain/models/event_record.dart';

/// “When can I fit this?” — calls Nest `/ai/suggest-schedule`.
class SuggestScheduleCard extends ConsumerStatefulWidget {
  const SuggestScheduleCard({super.key});

  @override
  ConsumerState<SuggestScheduleCard> createState() =>
      _SuggestScheduleCardState();
}

class _SuggestScheduleCardState extends ConsumerState<SuggestScheduleCard> {
  final _ctrl = TextEditingController();
  bool _busy = false;
  String? _addingKey;
  String? _error;
  final _added = <String>{};
  List<SuggestedEvent> _suggestions = const [];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _key(SuggestedEvent slot) => '${slot.title}|${slot.start.toIso8601String()}';

  Future<void> _findSlots() async {
    final prompt = _ctrl.text.trim();
    if (prompt.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _added.clear();
    });
    try {
      final slots = await suggestSchedule(
        session: ref.read(nestApiSessionProvider),
        prompt: prompt,
      );
      if (!mounted) return;
      setState(() {
        _suggestions = slots;
        if (slots.isEmpty) {
          _error = 'No slots found. Try a different request.';
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _suggestions = const [];
          _error = '$e';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _add(SuggestedEvent slot) async {
    final key = _key(slot);
    if (_addingKey != null) return;
    setState(() {
      _addingKey = key;
      _error = null;
    });
    try {
      await ref.read(eventRepositoryProvider).create(
            EventRecord(
              id: '',
              title: slot.title,
              startsAt: slot.start,
              endsAt: slot.end,
              description: slot.description,
            ),
          );
      if (!mounted) return;
      setState(() => _added.add(key));
      ref.read(calendarDataVersionProvider.notifier).bump();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _addingKey = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!DayPilotEnv.hasDaypilotApi) return const SizedBox.shrink();
    final scheme = DayPilotScheme.of(context);
    final fmt = DateFormat('EEE d MMM HH:mm');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'When can I fit this?',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Ask for a slot around your existing week. Nothing is added until you confirm.',
            style: TextStyle(color: scheme.textSecondary, height: 1.35),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  enabled: !_busy,
                  decoration: const InputDecoration(
                    hintText: 'e.g. 2 hours for deep work tomorrow morning',
                    isDense: true,
                  ),
                  textInputAction: TextInputAction.search,
                  onSubmitted: _busy ? null : (_) => _findSlots(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _busy ? null : _findSlots,
                child: Text(_busy ? 'Finding…' : 'Find slots'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
          ],
          for (final slot in _suggestions) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        slot.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: scheme.textPrimary,
                        ),
                      ),
                      Text(
                        '${fmt.format(slot.start.toLocal())} – ${fmt.format(slot.end.toLocal())}',
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: _added.contains(_key(slot)) || _addingKey == _key(slot)
                      ? null
                      : () => _add(slot),
                  child: Text(
                    _added.contains(_key(slot))
                        ? 'Added'
                        : _addingKey == _key(slot)
                            ? 'Adding…'
                            : 'Add',
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
