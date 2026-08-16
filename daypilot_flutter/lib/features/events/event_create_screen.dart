import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../core/workspace_colors.dart';
import '../../data/services/apple_calendar_service.dart';
import '../../domain/models/event_record.dart';
import '../../domain/models/workspace_record.dart';
import '../calendar/calendar_providers.dart';
import '../insights/insights_providers.dart';
import 'event_form_fields.dart';

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
  /// null = DayPilot only; otherwise EventKit calendar id.
  String? _destinationCalendarId;
  List<({String id, String title})> _writableCalendars = [];
  String? _workspaceId;
  String _colorHex = kWorkspaceColorPalette.first.hex;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDestinations());
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _location.dispose();
    super.dispose();
  }

  Future<void> _loadDestinations() async {
    if (!AppleCalendarService.isSupported) return;
    try {
      final service = AppleCalendarService();
      final calendars = await service.getAvailableDeviceCalendars();
      final writable = calendars
          .where((c) => !c.isReadOnly && !c.duplicatePrevented)
          .map((c) => (id: c.id, title: c.title))
          .toList();
      if (mounted) setState(() => _writableCalendars = writable);
    } catch (_) {}
  }

  void _syncWorkspaceDefaults(List<WorkspaceRecord> workspaces) {
    if (workspaces.isEmpty || _workspaceId != null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _workspaceId != null) return;
      setState(() {
        _workspaceId = workspaces.first.id;
        _colorHex = workspaces.first.color;
      });
    });
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

  Future<void> _onColorChanged(String hex, List<WorkspaceRecord> workspaces) async {
    setState(() => _colorHex = hex);
    final id = _workspaceId;
    if (id == null) return;
    try {
      await ref.read(workspaceRepositoryProvider).updateColor(
            workspaceId: id,
            color: hex,
            workspaces: workspaces,
          );
      ref.invalidate(workspacesProvider);
    } catch (e) {
      if (!mounted) return;
      final current = workspaces.where((w) => w.id == id);
      setState(() {
        _colorHex = current.isEmpty ? hex : current.first.color;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_end.isAfter(_start)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End time must be after start.')),
      );
      return;
    }
    final title = _title.text.trim();
    final description =
        _desc.text.trim().isEmpty ? null : _desc.text.trim();
    final location =
        _location.text.trim().isEmpty ? null : _location.text.trim();

    if (_destinationCalendarId != null && AppleCalendarService.isSupported) {
      try {
        final service = AppleCalendarService();
        final externalId = await service.createAppleCalendarEvent(
          calendarId: _destinationCalendarId!,
          title: title,
          start: _start,
          end: _end,
          description: description,
          location: location,
          allDay: _allDay,
        );
        final deviceId = await service.deviceId();
        await ref.read(calendarConnectionsRepositoryProvider).syncEventKit(
              deviceId: deviceId,
              deviceLabel: 'iPhone',
                  calendars: [
                {
                  'externalCalendarId': _destinationCalendarId!,
                  'title': () {
                    for (final c in _writableCalendars) {
                      if (c.id == _destinationCalendarId) return c.title;
                    }
                    return 'Calendar';
                  }(),
                  'isSelected': true,
                  'isReadOnly': false,
                },
              ],
              events: [
                {
                  'externalEventId': externalId,
                  'externalCalendarId': _destinationCalendarId!,
                  'title': title,
                  'startsAt': _start.toUtc().toIso8601String(),
                  'endsAt': _end.toUtc().toIso8601String(),
                  'description': ?description,
                  'location': ?location,
                  'allDay': _allDay,
                },
              ],
              reconcileDeletes: false,
            );
        ref.read(calendarDataVersionProvider.notifier).bump();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Apple Calendar save failed: $e')),
          );
        }
        return;
      }
    }

    final draft = EventRecord(
      id: const Uuid().v4(),
      title: title,
      description: description,
      location: location,
      startsAt: _start,
      endsAt: _end,
      allDay: _allDay,
      workspaceId: _workspaceId,
      calendarColor: _colorHex,
    );
    // Still create DayPilot native when destination is DayPilot.
    if (_destinationCalendarId == null) {
      final saved = await ref.read(eventRepositoryProvider).create(draft);
      ref.invalidate(calendarMonthEventsFamily);
      ref.invalidate(calendarWeekEventsFamily);
      ref.invalidate(calendarDayEventsFamily);
      ref.invalidate(latestInsightProvider);
      if (mounted) context.go('/events/${saved.id}');
      return;
    }
    ref.invalidate(calendarMonthEventsFamily);
    ref.invalidate(calendarWeekEventsFamily);
    ref.invalidate(calendarDayEventsFamily);
    ref.invalidate(latestInsightProvider);
    if (mounted) context.go('/calendar');
  }

  @override
  Widget build(BuildContext context) {
    final workspacesAsync = ref.watch(workspacesProvider);
    final workspaces =
        workspacesAsync.asData?.value ?? const <WorkspaceRecord>[];
    _syncWorkspaceDefaults(workspaces);
    final colors = DayPilotScheme.of(context);

    return DayPilotPageShell(
      title: const Text('New event'),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            children: [
              EventLabeledField(
                label: 'Title',
                child: TextFormField(
                  controller: _title,
                  decoration: eventFieldDecoration(context, hint: 'Title'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ),
              EventLabeledField(
                label: 'Description',
                child: TextFormField(
                  controller: _desc,
                  decoration: eventFieldDecoration(
                    context,
                    hint: 'Optional notes',
                  ),
                  maxLines: 3,
                ),
              ),
              EventLabeledField(
                label: 'Location / meeting URL',
                child: TextFormField(
                  controller: _location,
                  decoration: eventFieldDecoration(
                    context,
                    hint: 'Location or link',
                  ),
                ),
              ),
              if (_writableCalendars.isNotEmpty)
                EventLabeledField(
                  label: 'Save to calendar',
                  child: DropdownButtonFormField<String?>(
                    initialValue: _destinationCalendarId,
                    decoration: eventFieldDecoration(context),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('DayPilot'),
                      ),
                      ..._writableCalendars.map(
                        (c) => DropdownMenuItem<String?>(
                          value: c.id,
                          child: Text(c.title),
                        ),
                      ),
                    ],
                    onChanged: (v) =>
                        setState(() => _destinationCalendarId = v),
                  ),
                ),
              WorkspaceColorFields(
                workspaces: workspaces,
                workspaceId: _workspaceId,
                colorHex: _colorHex,
                loading: workspacesAsync.isLoading,
                onWorkspaceChanged: (id) {
                  final ws = workspaces.where((w) => w.id == id);
                  setState(() {
                    _workspaceId = id;
                    if (ws.isNotEmpty) _colorHex = ws.first.color;
                  });
                },
                onColorChanged: (hex) => _onColorChanged(hex, workspaces),
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
                title: Text(
                  'Starts',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: colors.textPrimary,
                  ),
                ),
                subtitle: Text(_formatStartEnd(context, _start)),
                onTap: _pickStart,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  'Ends',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: colors.textPrimary,
                  ),
                ),
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
