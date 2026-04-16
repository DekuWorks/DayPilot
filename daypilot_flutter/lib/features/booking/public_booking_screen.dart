import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/widgets/async_body.dart';
import '../../core/widgets/daypilot_page_shell.dart';
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
  Object? _error;
  var _slots = <BookingSlot>[];
  String? _pageId;
  final _email = TextEditingController();
  final _name = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
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
      final page =
          await ref.read(bookingRepositoryProvider).getPageBySlug(widget.slug);
      if (page == null) {
        setState(() {
          _loading = false;
          _slots = [];
          _pageId = null;
        });
        return;
      }
      _pageId = page.id;
      final slots =
          await ref.read(bookingRepositoryProvider).listSlotsForPage(page.id);
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid email.')),
      );
      return;
    }
    try {
      await ref.read(bookingRepositoryProvider).confirmBooking(
            bookingPageId: pageId,
            slot: slot,
            guestEmail: email,
            guestName: _name.text.trim().isEmpty ? null : _name.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking confirmed.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: $e')),
      );
    }
  }

  String _formatSlotRange(BuildContext context, BookingSlot s) {
    final loc = MaterialLocalizations.of(context);
    final a = s.startsAt.toLocal();
    final b = s.endsAt.toLocal();
    final sameDay =
        a.year == b.year && a.month == b.month && a.day == b.day;
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
          child: ListView(
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
                    _selected == s ? Icons.check_circle : Icons.circle_outlined,
                    color: s.isFull
                        ? Theme.of(context).disabledColor
                        : Theme.of(context).colorScheme.primary,
                  ),
                  onTap: s.isFull ? null : () => setState(() => _selected = s),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed:
                    _selected == null || _selected!.isFull ? null : _confirm,
                child: const Text('Confirm'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
