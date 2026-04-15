import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/async_body.dart';
import '../../domain/models/attendee.dart';
import '../../domain/models/rsvp.dart';

/// RSVP list for an event (task 21).
class AttendeeListScreen extends ConsumerStatefulWidget {
  const AttendeeListScreen({super.key, required this.eventId});

  final String eventId;

  @override
  ConsumerState<AttendeeListScreen> createState() =>
      _AttendeeListScreenState();
}

class _AttendeeListScreenState extends ConsumerState<AttendeeListScreen> {
  bool _loading = true;
  Object? _error;
  var _attendees = <Attendee>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list =
          await ref.read(attendeeRepositoryProvider).listForEvent(widget.eventId);
      setState(() {
        _attendees = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Attendees')),
      body: AsyncBody(
        isLoading: _loading,
        error: _error,
        isEmpty: !_loading && _attendees.isEmpty,
        emptyMessage: 'No attendees yet.',
        child: ListView(
          padding: const EdgeInsets.all(8),
          children: [
            ..._attendees.map(
              (a) => ListTile(
                title: Text(a.email),
                subtitle: Text(a.name ?? ''),
                trailing: Text(a.rsvpStatus),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: FilledButton(
                onPressed: () async {
                  try {
                    await ref.read(attendeeRepositoryProvider).submitRsvp(
                          eventId: widget.eventId,
                          status: RsvpStatus.yes,
                        );
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('RSVP updated.')),
                    );
                    await _load();
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('$e')),
                    );
                  }
                },
                child: const Text('RSVP: Going (your account email)'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
