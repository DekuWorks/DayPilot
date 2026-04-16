import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/repository_providers.dart';
import '../calendar/calendar_providers.dart';
import '../insights/insights_providers.dart';
import '../attendees/attendee_list_screen.dart';

class EventDetailScreen extends ConsumerWidget {
  const EventDetailScreen({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(eventDetailProvider(eventId));
    return async.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Event')),
        body: Center(child: Text('$e')),
      ),
      data: (event) {
        if (event == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Event')),
            body: const Center(child: Text('Event not found.')),
          );
        }
        return Scaffold(
          appBar: AppBar(
            title: Text(event.title),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () => context.push('/events/$eventId/edit'),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              if (event.description != null && event.description!.isNotEmpty)
                Text(event.description!),
              if (event.description != null && event.description!.isNotEmpty)
                const SizedBox(height: 16),
              Text(
                'Starts: ${event.startsAt.toLocal()}',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              Text('Ends: ${event.endsAt.toLocal()}'),
              if (event.location != null && event.location!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Location: ${event.location}'),
              ],
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (c) => AttendeeListScreen(eventId: eventId),
                    ),
                  );
                },
                child: const Text('Attendees & RSVP'),
              ),
              const SizedBox(height: 8),
              FilledButton.tonalIcon(
                onPressed: () => _confirmDelete(context, ref),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete event'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete event?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      await ref.read(eventRepositoryProvider).delete(eventId);
      ref.invalidate(eventDetailProvider(eventId));
      ref.invalidate(calendarMonthEventsFamily);
      ref.invalidate(calendarWeekEventsFamily);
      ref.invalidate(calendarDayEventsFamily);
      ref.invalidate(latestInsightProvider);
      if (context.mounted) context.go('/dashboard');
    }
  }
}
