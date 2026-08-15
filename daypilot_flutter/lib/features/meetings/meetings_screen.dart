import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../domain/models/event_record.dart';

enum _MeetingFilter { upcoming, past, all }

final _meetingsProvider =
    FutureProvider.autoDispose<List<EventRecord>>((ref) {
  ref.watch(calendarDataVersionProvider);
  final now = DateTime.now();
  return ref.watch(eventRepositoryProvider).listForRange(
        from: now.subtract(const Duration(days: 60)),
        to: now.add(const Duration(days: 90)),
      );
});

class MeetingsScreen extends ConsumerStatefulWidget {
  const MeetingsScreen({super.key});

  @override
  ConsumerState<MeetingsScreen> createState() => _MeetingsScreenState();
}

class _MeetingsScreenState extends ConsumerState<MeetingsScreen> {
  _MeetingFilter _filter = _MeetingFilter.upcoming;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_meetingsProvider);
    final now = DateTime.now();
    return FeatureScaffold(
      title: 'Meetings',
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/events/new'),
        child: Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                for (final f in _MeetingFilter.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(switch (f) {
                        _MeetingFilter.upcoming => 'Upcoming',
                        _MeetingFilter.past => 'Past',
                        _MeetingFilter.all => 'All',
                      }),
                      selected: _filter == f,
                      onSelected: (_) => setState(() => _filter = f),
                      selectedColor: DayPilotColors.brand500,
                      labelStyle: TextStyle(
                        color: _filter == f
                            ? DayPilotScheme.of(context).textInverse
                            : DayPilotScheme.of(context).textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                      backgroundColor: DayPilotScheme.of(context).surfacePrimary,
                      side: BorderSide(color: DayPilotScheme.of(context).borderSubtle),
                      showCheckmark: false,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
              data: (all) {
                final list = all.where((e) {
                  switch (_filter) {
                    case _MeetingFilter.upcoming:
                      return e.endsAt.isAfter(now);
                    case _MeetingFilter.past:
                      return e.endsAt.isBefore(now);
                    case _MeetingFilter.all:
                      return true;
                  }
                }).toList();
                if (list.isEmpty) {
                  return Center(
                    child: Text(
                      'No meetings here.',
                      style: TextStyle(color: DayPilotScheme.of(context).textSecondary),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final e = list[i];
                    return NavTile(
                      icon: Icons.videocam_outlined,
                      title: e.title,
                      subtitle:
                          '${DateFormat.MMMd().add_jm().format(e.startsAt.toLocal())}'
                          '${(e.location ?? '').isNotEmpty ? ' · ${e.location}' : ''}',
                      onTap: () => context.push('/events/${e.id}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
