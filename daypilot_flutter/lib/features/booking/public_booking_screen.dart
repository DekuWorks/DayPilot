import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/async_body.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../domain/booking/booking_ics.dart';
import '../../domain/models/booking_page.dart';
import '../../domain/models/booking_slot.dart';

/// Public booking page loaded by slug (task 19–20).
class PublicBookingScreen extends ConsumerStatefulWidget {
  const PublicBookingScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<PublicBookingScreen> createState() =>
      _PublicBookingScreenState();
}

class _PublicBookingScreenState extends ConsumerState<PublicBookingScreen> {
  BookingSlot? _selected;
  bool _loading = true;
  bool _saving = false;
  bool _confirmed = false;
  bool _emailSent = false;
  Object? _error;
  var _slots = <BookingSlot>[];
  String? _pageId;
  String _pageTitle = 'Booking';
  var _choices = const <MeetingChoice>[];
  String? _methodId;
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _name = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

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
      final page = await ref
          .read(bookingRepositoryProvider)
          .getPageBySlug(widget.slug);
      if (page == null) {
        setState(() {
          _loading = false;
          _slots = [];
          _pageId = null;
        });
        return;
      }
      _pageId = page.id;
      _pageTitle = page.title;
      _choices = page.meetingChoices;
      _methodId = page.meetingChoices.length == 1
          ? page.meetingChoices.first.id
          : null;
      final slots = await ref
          .read(bookingRepositoryProvider)
          .listSlotsForPage(page.id);
      setState(() {
        _slots = slots;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _confirm() async {
    final slot = _selected;
    final pageId = _pageId;
    if (slot == null || pageId == null) return;
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter a valid email.')));
      return;
    }
    if (_choices.isNotEmpty && (_methodId == null || _methodId!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose how you want to meet.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final sent = await ref
          .read(bookingRepositoryProvider)
          .confirmBooking(
            bookingPageId: pageId,
            slot: slot,
            guestEmail: email,
            guestName: _name.text.trim().isEmpty ? null : _name.text.trim(),
            meetingMethod: _methodId,
            guestPhone: _methodId == 'phone' ? _phone.text : null,
          );
      if (!mounted) return;
      setState(() {
        _confirmed = true;
        _emailSent = sent;
        _saving = false;
      });
    } catch (e) {
      if (mounted) setState(() => _saving = false);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Booking failed: $e')));
    }
  }

  Future<void> _saveCalendarFile() async {
    final slot = _selected;
    if (slot == null) return;
    final name = _name.text.trim().isEmpty ? 'Guest' : _name.text.trim();
    final ics = buildBookingIcs(
      BookingIcsInput(
        uid:
            'booking-$_pageId-${slot.startsAt.toUtc().toIso8601String()}@daypilot.co',
        title: _pageTitle,
        description: 'Booked with DayPilot',
        start: slot.startsAt,
        end: slot.endsAt,
        attendeeName: name,
        attendeeEmail: _email.text.trim(),
      ),
    );
    await SharePlus.instance.share(
      ShareParams(
        files: [
          XFile.fromData(
            utf8.encode(ics),
            mimeType: 'text/calendar',
            name: 'daypilot-booking.ics',
          ),
        ],
        fileNameOverrides: const ['daypilot-booking.ics'],
      ),
    );
  }

  String _formatSlotRange(BuildContext context, BookingSlot s) {
    final loc = MaterialLocalizations.of(context);
    final a = s.startsAt.toLocal();
    final b = s.endsAt.toLocal();
    final sameDay = a.year == b.year && a.month == b.month && a.day == b.day;
    final ta = TimeOfDay.fromDateTime(a).format(context);
    final tb = TimeOfDay.fromDateTime(b).format(context);
    if (sameDay) {
      return '${loc.formatMediumDate(a)} · $ta–$tb';
    }
    return '${loc.formatMediumDate(a)} $ta – ${loc.formatMediumDate(b)} $tb';
  }

  @override
  Widget build(BuildContext context) {
    return DayPilotPageShell(
      title: Text('Book · ${widget.slug}'),
      body: SafeArea(
        child: AsyncBody(
          isLoading: _loading,
          error: _error,
          isEmpty: !_loading && _slots.isEmpty,
          emptyMessage: 'No availability for this link.',
          child: _confirmed
              ? _ConfirmedBooking(
                  emailSent: _emailSent,
                  when: _selected == null
                      ? ''
                      : _formatSlotRange(context, _selected!),
                  onSave: _saveCalendarFile,
                )
              : ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Your email',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Your name (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    if (_choices.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text(
                        'How do you want to meet?',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      RadioGroup<String>(
                        groupValue: _methodId,
                        onChanged: (value) => setState(() => _methodId = value),
                        child: Column(
                          children: [
                            for (final choice in _choices)
                              RadioListTile<String>(
                                value: choice.id,
                                title: Text(choice.label),
                                subtitle: Text(choice.detail),
                              ),
                          ],
                        ),
                      ),
                      if (_methodId == 'phone')
                        TextField(
                          controller: _phone,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Your number, if you want a callback',
                            helperText:
                                'Optional. Only the host sees this after you book.',
                            border: OutlineInputBorder(),
                          ),
                        ),
                    ],
                    const SizedBox(height: 20),
                    Text(
                      'Choose a slot',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    ..._slots.map(
                      (s) => ListTile(
                        title: Text(_formatSlotRange(context, s)),
                        subtitle: Text(s.isFull ? 'Full' : 'Open'),
                        trailing: Icon(
                          _selected == s
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: s.isFull
                              ? Theme.of(context).disabledColor
                              : Theme.of(context).colorScheme.primary,
                        ),
                        onTap: s.isFull
                            ? null
                            : () => setState(() => _selected = s),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed:
                          _saving || _selected == null || _selected!.isFull
                          ? null
                          : _confirm,
                      child: Text(_saving ? 'Confirming…' : 'Confirm'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ConfirmedBooking extends StatelessWidget {
  const _ConfirmedBooking({
    required this.emailSent,
    required this.when,
    required this.onSave,
  });

  final bool emailSent;
  final String when;
  final Future<void> Function() onSave;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'You are booked',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(when),
        const SizedBox(height: 12),
        Text(
          emailSent
              ? 'We emailed a confirmation with a calendar file attached. You can also save that file here.'
              : 'The host will see this on their DayPilot calendar. The confirmation email did not send, so save the calendar file and keep this time.',
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => onSave(),
          child: const Text('Save calendar file'),
        ),
      ],
    );
  }
}
