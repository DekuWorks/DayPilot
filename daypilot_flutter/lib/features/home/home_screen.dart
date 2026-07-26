import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/gradient_brand_title.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_error_view.dart';

final _homeEventsProvider =
    FutureProvider.autoDispose<List<EventRecord>>((ref) {
  ref.watch(calendarDataVersionProvider);
  final now = DateTime.now();
  final start = DateTime(now.year, now.month, now.day);
  final end = start.add(const Duration(days: 1));
  return ref
      .watch(eventRepositoryProvider)
      .listForRange(from: start, to: end);
});

final _homeProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  return client
      .from('profiles')
      .select('first_name, last_name, username, display_name, name, email')
      .eq('id', uid)
      .maybeSingle();
});

/// Home tab — greeting, week strip, today's schedule, new event CTA.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(_homeProfileProvider);
    final events = ref.watch(_homeEventsProvider);
    final firstName = profile.maybeWhen(
      data: (p) {
        final f = (p?['first_name'] as String?)?.trim();
        if (f != null && f.isNotEmpty) return f;
        final d = (p?['display_name'] as String?)?.trim();
        if (d != null && d.isNotEmpty) return d.split(' ').first;
        final email = p?['email'] as String? ??
            ref.read(supabaseClientProvider).auth.currentUser?.email;
        return email?.split('@').first ?? 'there';
      },
      orElse: () => 'there',
    );

    final today = DateTime.now();
    final weekStart = today.subtract(Duration(days: today.weekday % 7));

    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: SafeArea(
        child: RefreshIndicator(
          color: DayPilotColors.brand500,
          onRefresh: () async {
            ref.read(calendarDataVersionProvider.notifier).bump();
            ref.invalidate(_homeEventsProvider);
            ref.invalidate(_homeProfileProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Row(
                children: [
                  Image.asset(
                    'assets/branding/logo_mark.png',
                    width: 36,
                    height: 36,
                  ),
                  const SizedBox(width: 10),
                  const Expanded(child: GradientBrandTitle(fontSize: 22)),
                  IconButton(
                    tooltip: 'Search',
                    onPressed: () => context.push('/search'),
                    icon: const Icon(Icons.search_rounded),
                    color: DayPilotColors.textSecondary,
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    onPressed: () => context.push('/notifications'),
                    icon: const Icon(Icons.notifications_outlined),
                    color: DayPilotColors.textSecondary,
                  ),
                  IconButton(
                    tooltip: 'Pilot Brief',
                    onPressed: () => context.push('/insights/brief'),
                    icon: const Icon(Icons.auto_awesome_rounded),
                    color: DayPilotColors.brand500,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                '${_greeting()}, $firstName',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: DayPilotColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('EEEE, MMMM d').format(today),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: DayPilotColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: 7,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final day = weekStart.add(Duration(days: i));
                    final isToday = day.year == today.year &&
                        day.month == today.month &&
                        day.day == today.day;
                    return InkWell(
                      onTap: () => context.go('/calendar'),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: 52,
                        decoration: BoxDecoration(
                          color: isToday
                              ? DayPilotColors.brand500
                              : DayPilotColors.surfacePrimary,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isToday
                                ? DayPilotColors.brand500
                                : DayPilotColors.borderSubtle,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              DateFormat('E').format(day).substring(0, 1),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isToday
                                    ? DayPilotColors.textInverse
                                    : DayPilotColors.textTertiary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${day.day}',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: isToday
                                    ? DayPilotColors.textInverse
                                    : DayPilotColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Text(
                    "Today's Schedule",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/calendar'),
                    child: const Text('See all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              events.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => CalendarErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(_homeEventsProvider),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: DayPilotColors.surfacePrimary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: DayPilotColors.borderSubtle),
                      ),
                      child: Text(
                        'Nothing on your calendar today. Add an event to get started.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: DayPilotColors.textSecondary,
                            ),
                      ),
                    );
                  }
                  return Column(
                    children: [
                      for (final e in list) ...[
                        _EventCard(event: e),
                        const SizedBox(height: 8),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () => context.push('/events/new'),
                icon: const Icon(Icons.add_rounded),
                label: const Text('New Event'),
              ),
              const SizedBox(height: 16),
              Text(
                'Workspace',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.sticky_note_2_outlined, size: 18),
                    label: const Text('Notes'),
                    onPressed: () => context.push('/notes'),
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.folder_outlined, size: 18),
                    label: const Text('Projects'),
                    onPressed: () => context.push('/projects'),
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.videocam_outlined, size: 18),
                    label: const Text('Meetings'),
                    onPressed: () => context.push('/meetings'),
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.contacts_outlined, size: 18),
                    label: const Text('Contacts'),
                    onPressed: () => context.push('/contacts'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event});

  final EventRecord event;

  @override
  Widget build(BuildContext context) {
    final time = DateFormat.jm().format(event.startsAt);
    final end = DateFormat.jm().format(event.endsAt);
    return InkWell(
      onTap: () => context.push('/events/${event.id}'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: DayPilotColors.surfacePrimary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DayPilotColors.borderSubtle),
        ),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 72,
              decoration: const BoxDecoration(
                color: DayPilotColors.brand500,
                borderRadius:
                    BorderRadius.horizontal(left: Radius.circular(12)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: DayPilotColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$time – $end',
                      style: const TextStyle(
                        fontSize: 13,
                        color: DayPilotColors.textSecondary,
                      ),
                    ),
                    if ((event.location ?? '').isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        event.location!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: DayPilotColors.textTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Icon(
                Icons.chevron_right_rounded,
                color: DayPilotColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
