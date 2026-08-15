import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

final myBookingLinksProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return [];
  final rows = await client
      .from('booking_links')
      .select('id, slug, title, duration, is_active, description')
      .eq('owner_user_id', uid)
      .order('created_at', ascending: false);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

/// Owner booking-link setup (create / toggle / open public page).
class BookingLinksScreen extends ConsumerStatefulWidget {
  const BookingLinksScreen({super.key});

  @override
  ConsumerState<BookingLinksScreen> createState() => _BookingLinksScreenState();
}

class _BookingLinksScreenState extends ConsumerState<BookingLinksScreen> {
  Future<void> _create() async {
    final slugCtrl = TextEditingController();
    final titleCtrl = TextEditingController(text: 'Book time with me');
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('New booking link'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: slugCtrl,
              decoration: const InputDecoration(
                labelText: 'Slug',
                hintText: 'marcus',
                prefixText: '/book/',
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[a-z0-9\-]')),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Create'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final slug = slugCtrl.text.trim().toLowerCase();
    if (slug.length < 3) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Slug must be at least 3 characters')),
      );
      return;
    }
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      final row = await client
          .from('booking_links')
          .insert({
            'owner_user_id': uid,
            'slug': slug,
            'title': titleCtrl.text.trim().isEmpty
                ? 'Book time with me'
                : titleCtrl.text.trim(),
            'duration': 30,
            'timezone': 'America/New_York',
            'is_active': true,
            'type': 'one-on-one',
          })
          .select('id')
          .single();
      final linkId = row['id'] as String;
      // Weekday 9–5 availability (0=Sun … 6=Sat)
      final rules = [
        for (var d = 1; d <= 5; d++)
          {
            'booking_link_id': linkId,
            'day_of_week': d,
            'start_time': '09:00',
            'end_time': '17:00',
            'is_available': true,
          },
      ];
      await client.from('availability_rules').insert(rules);
      ref.invalidate(myBookingLinksProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Created /book/$slug')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  Future<void> _toggle(Map<String, dynamic> link) async {
    await ref.read(supabaseClientProvider).from('booking_links').update({
      'is_active': !(link['is_active'] as bool? ?? true),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', link['id']);
    ref.invalidate(myBookingLinksProvider);
  }

  Future<void> _openPublic(String slug) async {
    final uri = Uri.parse('https://www.daypilot.co/book/$slug');
    // Prefer in-app route if available
    if (!mounted) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _copy(String slug) async {
    await Clipboard.setData(
      ClipboardData(text: 'https://www.daypilot.co/book/$slug'),
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link copied')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(myBookingLinksProvider);
    return FeatureScaffold(
      title: 'Booking links',
      floatingActionButton: FloatingActionButton(
        onPressed: _create,
        child: Icon(Icons.add_rounded),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Create a booking link so others can book time with you.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: DayPilotScheme.of(context).textSecondary),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final link = list[i];
              final slug = '${link['slug']}';
              final active = link['is_active'] as bool? ?? false;
              return Container(
                decoration: BoxDecoration(
                  color: DayPilotScheme.of(context).surfacePrimary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
                ),
                child: ListTile(
                  title: Text(
                    '${link['title'] ?? slug}',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    '/book/$slug · ${link['duration'] ?? 30} min · '
                    '${active ? 'Active' : 'Paused'}',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'copy') _copy(slug);
                      if (v == 'open') _openPublic(slug);
                      if (v == 'toggle') _toggle(link);
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'copy', child: Text('Copy link')),
                      const PopupMenuItem(
                        value: 'open',
                        child: Text('Open public page'),
                      ),
                      PopupMenuItem(
                        value: 'toggle',
                        child: Text(active ? 'Pause' : 'Activate'),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
