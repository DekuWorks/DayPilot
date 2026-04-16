import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_providers.dart';
import '../insights/insights_providers.dart';

class EventEditScreen extends ConsumerStatefulWidget {
  const EventEditScreen({super.key, required this.eventId});

  final String eventId;

  @override
  ConsumerState<EventEditScreen> createState() => _EventEditScreenState();
}

class _EventEditScreenState extends ConsumerState<EventEditScreen> {
  final _title = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = true;
  EventRecord? _event;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final e = await ref.read(eventRepositoryProvider).getById(widget.eventId);
    if (e != null) {
      _title.text = e.title;
    }
    setState(() {
      _event = e;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final current = _event;
    if (current == null) return;
    final updated = EventRecord(
      id: current.id,
      title: _title.text.trim(),
      description: current.description,
      location: current.location,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      ownerId: current.ownerId,
      calendarId: current.calendarId,
      allDay: current.allDay,
      status: current.status,
    );
    await ref.read(eventRepositoryProvider).update(updated);
    ref.invalidate(eventDetailProvider(widget.eventId));
    ref.invalidate(calendarMonthEventsFamily);
    ref.invalidate(calendarWeekEventsFamily);
    ref.invalidate(calendarDayEventsFamily);
    ref.invalidate(latestInsightProvider);
    if (mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const DayPilotPageShell(
        title: Text('Edit event'),
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_event == null) {
      return DayPilotPageShell(
        title: const Text('Event'),
        body: const Center(child: Text('Event not found.')),
      );
    }
    return DayPilotPageShell(
      title: const Text('Edit event'),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              TextFormField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _save,
                child: const Text('Save changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
