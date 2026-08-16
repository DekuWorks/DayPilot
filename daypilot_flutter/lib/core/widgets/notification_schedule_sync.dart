import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/bootstrap_providers.dart';
import '../providers/calendar_refresh_provider.dart';
import '../providers/notification_preference_provider.dart';
import '../providers/repository_providers.dart';

/// When notifications are on, schedule local event + Pilot Brief alerts.
class NotificationScheduleSync extends ConsumerStatefulWidget {
  const NotificationScheduleSync({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<NotificationScheduleSync> createState() =>
      _NotificationScheduleSyncState();
}

class _NotificationScheduleSyncState
    extends ConsumerState<NotificationScheduleSync> {
  int _token = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  Future<void> _sync() async {
    final token = ++_token;
    final pref = ref.read(notificationPreferenceProvider);
    final local = ref.read(localNotificationsServiceProvider);
    if (!pref.enabled) return;
    final user = ref.read(supabaseClientProvider).auth.currentUser;
    if (user == null) return;
    try {
      final now = DateTime.now();
      final events = await ref.read(eventRepositoryProvider).listForRange(
            from: now,
            to: now.add(const Duration(days: 7)),
          );
      if (!mounted || token != _token) return;
      await local.reschedule(
        events: [
          for (final e in events)
            (id: e.id, title: e.title, startsAt: e.startsAt),
        ],
        now: now,
      );
    } catch (_) {
      // Calendar fetch can fail before Nest exchange; try again on next bump.
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(notificationPreferenceProvider, (prev, next) {
      if (next.enabled) {
        _sync();
      }
    });
    ref.listen(calendarDataVersionProvider, (prev, next) {
      if (ref.read(notificationPreferenceProvider).enabled) {
        _sync();
      }
    });
    return widget.child;
  }
}
