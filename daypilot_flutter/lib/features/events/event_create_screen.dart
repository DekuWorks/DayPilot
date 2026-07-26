import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../domain/models/event_record.dart';
import '../calendar/calendar_providers.dart';
import '../insights/insights_providers.dart';

class EventCreateScreen extends ConsumerStatefulWidget {
  const EventCreateScreen({super.key});

  @override
  ConsumerState<EventCreateScreen> createState() => _EventCreateScreenState();
}

class _EventCreateScreenState extends ConsumerState<EventCreateScreen> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _location = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  DateTime _start = DateTime.now();
  DateTime _end = DateTime.now().add(const Duration(hours: 1));
  bool _allDay = false;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _location.dispose();
    super.dispose();
  }

  String _formatStartEnd(BuildContext context, DateTime d) {
    final loc = MaterialLocalizations.of(context);
    if (_allDay) return loc.formatMediumDate(d);
    final t = TimeOfDay.fromDateTime(d).format(context);
    return '${loc.formatMediumDate(d)} · $t';
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
      setState(() {
        _start = DateTime(d.year, d.month, d.day);
        _end = DateTime(d.year, d.month, d.day, 23, 59);
      });
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
      setState(() {
        _end = DateTime(d.year, d.month, d.day, 23, 59);
      });
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
    if (!_end.isAfter(_start)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End time must be after start.')),
      );
      return;
    }
    final draft = EventRecord(
      id: const Uuid().v4(),
      title: _title.text.trim(),
      description: _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      location: _location.text.trim().isEmpty ? null : _location.text.trim(),
      startsAt: _start,
      endsAt: _end,
      allDay: _allDay,
    );
    final saved = await ref.read(eventRepositoryProvider).create(draft);
    ref.invalidate(calendarMonthEventsFamily);
    ref.invalidate(calendarWeekEventsFamily);
    ref.invalidate(calendarDayEventsFamily);
    ref.invalidate(latestInsightProvider);
    if (mounted) context.go('/events/${saved.id}');
  }

  @override
  Widget build(BuildContext context) {
    return DayPilotPageShell(
      title: const Text('New event'),
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
                onChanged: (v) => setState(() {
                  _allDay = v;
                  if (v) {
                    _start = DateTime(_start.year, _start.month, _start.day);
                    _end = DateTime(
                      _start.year,
                      _start.month,
                      _start.day,
                      23,
                      59,
                    );
                  }
                }),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Starts'),
                subtitle: Text(_formatStartEnd(context, _start)),
                onTap: _pickStart,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Ends'),
                subtitle: Text(_formatStartEnd(context, _end)),
                onTap: _pickEnd,
              ),
              const SizedBox(height: 24),
              FilledButton(onPressed: _save, child: const Text('Save')),
            ],
          ),
        ),
      ),
    );
  }
}
