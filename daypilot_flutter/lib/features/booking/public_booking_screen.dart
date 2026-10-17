import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/async_body.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/daypilot_page_shell.dart';
import '../../core/widgets/dp_cards.dart';
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
  DateTime? _day;
  bool _detailsStep = false;
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
        _day = firstOpenDay(slots);
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

  /// Step one: how to meet, which day, which time. Then Continue.
  Widget _pickStep(BuildContext context) {
    final colors = context.dp;
    final byDay = groupSlotsByDay(_slots);
    final days = byDay.keys.toList()..sort();
    final daySlots = _day == null
        ? const <BookingSlot>[]
        : (byDay[_day] ?? const <BookingSlot>[]);
    final canContinue =
        _selected != null &&
        !_selected!.isFull &&
        (_choices.isEmpty || (_methodId != null && _methodId!.isNotEmpty));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          _pageTitle,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: colors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Pick a time from the hours the host has set.',
          style: TextStyle(fontSize: 13, color: colors.textSecondary),
        ),
        if (_choices.isNotEmpty) ...[
          const SizedBox(height: 18),
          const DpSectionTitle(title: 'Meeting type'),
          const SizedBox(height: 8),
          for (final choice in _choices)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Semantics(
                button: true,
                selected: _methodId == choice.id,
                label: '${choice.label}. ${choice.detail}',
                excludeSemantics: true,
                child: DpCard(
                  selected: _methodId == choice.id,
                  onTap: () => setState(() => _methodId = choice.id),
                  child: Row(
                    children: [
                      DpIconTile(
                        icon: meetingMethodIcon(choice.id),
                        tint: colors.accent,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              choice.label,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: colors.textPrimary,
                              ),
                            ),
                            if (choice.detail.isNotEmpty)
                              Text(
                                choice.detail,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colors.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                      Icon(
                        _methodId == choice.id
                            ? Icons.check_circle_rounded
                            : Icons.chevron_right_rounded,
                        color: _methodId == choice.id
                            ? colors.accent
                            : colors.textTertiary,
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
        const SizedBox(height: 14),
        const DpSectionTitle(title: 'Date'),
        const SizedBox(height: 8),
        SizedBox(
          height: 68,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final d = days[i];
              final active = d == _day;
              return Semantics(
                button: true,
                selected: active,
                label: DateFormat('EEEE d MMMM').format(d),
                excludeSemantics: true,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => setState(() {
                    _day = d;
                    _selected = null;
                  }),
                  child: Container(
                    width: 58,
                    decoration: BoxDecoration(
                      color: active ? colors.accent : colors.surfacePrimary,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: active ? colors.accent : colors.borderSubtle,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          DateFormat('EEE').format(d),
                          style: TextStyle(
                            fontSize: 11,
                            color: active ? Colors.white : colors.textSecondary,
                          ),
                        ),
                        Text(
                          '${d.day}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: active ? Colors.white : colors.textPrimary,
                          ),
                        ),
                        Text(
                          DateFormat('MMM').format(d),
                          style: TextStyle(
                            fontSize: 10,
                            color: active ? Colors.white : colors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 14),
        const DpSectionTitle(title: 'Time'),
        const SizedBox(height: 8),
        if (daySlots.isEmpty)
          Text(
            'No open times on this day.',
            style: TextStyle(color: colors.textSecondary),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in daySlots)
                Semantics(
                  button: true,
                  selected: _selected == s,
                  enabled: !s.isFull,
                  label:
                      '${TimeOfDay.fromDateTime(s.startsAt.toLocal()).format(context)}${s.isFull ? ', full' : ''}',
                  excludeSemantics: true,
                  child: ChoiceChip(
                    label: Text(
                      TimeOfDay.fromDateTime(
                        s.startsAt.toLocal(),
                      ).format(context),
                    ),
                    selected: _selected == s,
                    showCheckmark: false,
                    onSelected: s.isFull
                        ? null
                        : (_) => setState(() => _selected = s),
                    selectedColor: colors.accent,
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _selected == s
                          ? Colors.white
                          : s.isFull
                          ? colors.textTertiary
                          : colors.textPrimary,
                    ),
                    side: BorderSide(
                      color: _selected == s
                          ? colors.accent
                          : colors.borderSubtle,
                    ),
                  ),
                ),
            ],
          ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: canContinue
              ? () => setState(() => _detailsStep = true)
              : null,
          child: const Text('Continue'),
        ),
        if (!canContinue)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _choices.isNotEmpty && _methodId == null
                  ? 'Choose how you want to meet, then a time.'
                  : 'Choose a time to continue.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: colors.textSecondary),
            ),
          ),
      ],
    );
  }

  /// Step two: who is booking. Confirms with the same call as before.
  Widget _detailsView(BuildContext context) {
    final colors = context.dp;
    final slot = _selected!;
    final choice = _choices.where((c) => c.id == _methodId).firstOrNull;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        DpCard(
          child: Row(
            children: [
              DpIconTile(
                icon: Icons.event_available_rounded,
                tint: colors.accent,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _pageTitle,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: colors.textPrimary,
                      ),
                    ),
                    Text(
                      _formatSlotRange(context, slot),
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.textSecondary,
                      ),
                    ),
                    if (choice != null)
                      Text(
                        choice.label,
                        style: TextStyle(
                          fontSize: 12,
                          color: colors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _detailsStep = false),
                child: const Text('Change'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
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
        if (_methodId == 'phone') ...[
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Your number, if you want a callback',
              helperText: 'Optional. Only the host sees this after you book.',
              border: OutlineInputBorder(),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _saving || slot.isFull ? null : _confirm,
          child: Text(_saving ? 'Confirming…' : 'Confirm'),
        ),
      ],
    );
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
              : (_detailsStep && _selected != null)
              ? _detailsView(context)
              : _pickStep(context),
        ),
      ),
    );
  }
}

/// Icon for a host-configured meeting method. Only the four DayPilot supports.
IconData meetingMethodIcon(String id) => switch (id) {
  'phone' => Icons.call_outlined,
  'slack' => Icons.forum_outlined,
  'discord' => Icons.headset_mic_outlined,
  _ => Icons.link_rounded,
};

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// Groups slots by local calendar day. Days with no slots are absent.
Map<DateTime, List<BookingSlot>> groupSlotsByDay(List<BookingSlot> slots) {
  final out = <DateTime, List<BookingSlot>>{};
  final sorted = [...slots]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  for (final s in sorted) {
    (out[_dateOnly(s.startsAt.toLocal())] ??= []).add(s);
  }
  return out;
}

/// Earliest day that still has a slot that is not full, else the earliest day.
DateTime? firstOpenDay(List<BookingSlot> slots) {
  final byDay = groupSlotsByDay(slots);
  if (byDay.isEmpty) return null;
  final days = byDay.keys.toList()..sort();
  for (final d in days) {
    if (byDay[d]!.any((s) => !s.isFull)) return d;
  }
  return days.first;
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
    final colors = context.dp;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DpCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DpIconTile(
                icon: Icons.check_circle_outline_rounded,
                tint: colors.accent,
              ),
              const SizedBox(height: 12),
              Text(
                'You are booked',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: colors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(when, style: TextStyle(color: colors.textPrimary)),
              const SizedBox(height: 12),
              Text(
                emailSent
                    ? 'We emailed a confirmation with a calendar file attached. You can also save that file here.'
                    : 'The host will see this on their DayPilot calendar. The confirmation email did not send, so save the calendar file and keep this time.',
                style: TextStyle(color: colors.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => onSave(),
          child: const Text('Save calendar file'),
        ),
      ],
    );
  }
}
