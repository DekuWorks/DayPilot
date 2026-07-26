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
  final _desc = TextEditingController();
  final _location = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = true;
  EventRecord? _event;
  late DateTime _start;
  late DateTime _end;
  bool _allDay = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final e = await ref.read(eventRepositoryProvider).getById(widget.eventId);
    if (e != null) {
      _title.text = e.title;
      _desc.text = e.description ?? '';
      _location.text = e.location ?? '';
      _start = e.startsAt;
      _end = e.endsAt;
      _allDay = e.allDay;
    }
    setState(() {
      _event = e;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _location.dispose();
    super.dispose();
  }

  String _format(BuildContext context, DateTime d) {
    final loc = MaterialLocalizations.of(context);
    if (_allDay) return loc.formatMediumDate(d);
    return '${loc.formatMediumDate(d)} · ${TimeOfDay.fromDateTime(d).format(context)}';
  }

  Future<void> _pickStart() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _start,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (d == null) return;
    if (_allDay) {
      setState(() => _start = DateTime(d.year, d.month, d.day));
      return;
    }
    if (!mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_start),
    );
    if (t == null) return;
    setState(() {
      _start = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    });
  }

  Future<void> _pickEnd() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _end,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (d == null) return;
    if (_allDay) {
      setState(() => _end = DateTime(d.year, d.month, d.day, 23, 59));
      return;
    }
    if (!mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_end),
    );
    if (t == null) return;
    setState(() {
      _end = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final current = _event;
    if (current == null) return;
    if (!_end.isAfter(_start)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End time must be after start.')),
      );
      return;
    }
    final updated = EventRecord(
      id: current.id,
      title: _title.text.trim(),
      description: _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      location: _location.text.trim().isEmpty ? null : _location.text.trim(),
      startsAt: _start,
      endsAt: _end,
      ownerId: current.ownerId,
      calendarId: current.calendarId,
      allDay: _allDay,
      status: current.status,
      source: current.source,
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
      return const DayPilotPageShell(
        title: Text('Event'),
        body: Center(child: Text('Event not found.')),
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
              TextFormField(
                controller: _desc,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
              ),
              TextFormField(
                controller: _location,
                decoration: const InputDecoration(
                  labelText: 'Location / meeting URL',
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('All day'),
                value: _allDay,
                onChanged: (v) => setState(() => _allDay = v),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Starts'),
                subtitle: Text(_format(context, _start)),
                onTap: _pickStart,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Ends'),
                subtitle: Text(_format(context, _end)),
                onTap: _pickEnd,
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
