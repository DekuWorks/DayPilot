import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/widget_snapshot_writer.dart';
import '../../features/calendar/calendar_providers.dart';
import '../../features/profile/profile_providers.dart';
import '../../features/tasks/tasks_screen.dart';
import '../providers/bootstrap_providers.dart';

/// After Home/calendar/tasks load, publish a WidgetKit snapshot. No new UI.
class WidgetSnapshotSync extends ConsumerWidget {
  const WidgetSnapshotSync({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    ref.listen(calendarDayEventsFamily(day), (_, __) => _publish(ref, day));
    ref.listen(tasksListProvider, (_, __) => _publish(ref, day));
    ref.listen(currentProfileProvider, (_, __) => _publish(ref, day));
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish(ref, day));
    return child;
  }

  void _publish(WidgetRef ref, DateTime day) {
    final events = ref.read(calendarDayEventsFamily(day)).asData?.value;
    final tasks = ref.read(tasksListProvider).asData?.value;
    if (events == null || tasks == null) return;
    final email =
        ref.read(supabaseClientProvider).auth.currentUser?.email ?? '';
    final name = ref.read(currentProfileProvider).maybeWhen(
          data: (p) => profileDisplayName(p, email),
          orElse: () => email.split('@').first.isEmpty
              ? 'Pilot'
              : email.split('@').first,
        );
    WidgetSnapshotWriter.publish(
      displayName: name,
      events: events,
      tasks: tasks,
    );
  }
}
