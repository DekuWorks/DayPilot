import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/profile_avatar.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_panel.dart';
import '../calendar/calendar_view_mode.dart';
import '../profile/profile_providers.dart';

final _homeNextEventProvider =
    FutureProvider.autoDispose<EventRecord?>((ref) async {
  ref.watch(calendarDataVersionProvider);
  final now = DateTime.now();
  final start = DateTime(now.year, now.month, now.day);
  final end = start.add(const Duration(days: 2));
  final events = await ref
      .watch(eventRepositoryProvider)
      .listForRange(from: start, to: end);
  final upcoming = events.where((e) => !e.endsAt.isBefore(now)).toList()
    ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  if (upcoming.isEmpty) return null;
  return upcoming.first;
});

/// Home tab — compact greeting + optional next-event line + calendar.
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
    final colors = context.dp;
    final profile = ref.watch(currentProfileProvider);
    final nextEvent = ref.watch(_homeNextEventProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final view = parseCalendarViewMode(
      GoRouterState.of(context).uri.queryParameters['view'],
    );

    final firstName = profile.maybeWhen(
      data: (p) => profileGreetingFirstName(p, user?.userMetadata),
      orElse: () => profileGreetingFirstName(null, user?.userMetadata),
    );
    final initials = profileInitials(firstName);
    final avatarUrl = profile.maybeWhen(
      data: (p) => resolveAvatarUrl(p, user),
      orElse: () => authMetadataAvatarUrl(user),
    );
    final next = nextEvent.maybeWhen(
      data: (event) => event,
      orElse: () => null,
    );

    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        bottom: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 2, 4, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${_greeting()}, $firstName',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push('/insights/brief'),
                    child: const Text('Pilot Brief'),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    visualDensity: VisualDensity.compact,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    padding: EdgeInsets.zero,
                    onPressed: () => context.push('/notifications'),
                    icon: const Icon(Icons.notifications_outlined, size: 20),
                    color: colors.textSecondary,
                  ),
                  IconButton(
                    tooltip: 'New event',
                    visualDensity: VisualDensity.compact,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    padding: EdgeInsets.zero,
                    onPressed: () => context.push('/events/new'),
                    icon: const Icon(Icons.add_circle_rounded, size: 22),
                    color: colors.accent,
                  ),
                  GestureDetector(
                    onTap: () => context.go('/profile'),
                    child: ProfileAvatar(
                      initials: initials,
                      imageUrl: avatarUrl,
                      radius: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
            if (next != null)
              GestureDetector(
                onTap: () => context.push('/events/${next.id}'),
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 2),
                  child: Text(
                    '${DateFormat.jm().format(next.startsAt)} · ${next.title}',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      height: 1.2,
                      color: colors.accent,
                    ),
                  ),
                ),
              ),
            Expanded(
              child: CalendarPanel(initialView: view),
            ),
          ],
        ),
      ),
    );
  }
}
