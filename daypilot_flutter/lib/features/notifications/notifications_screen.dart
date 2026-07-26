import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

final notificationsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('notifications')
      .select(
        'id, type, title, body, resource_type, resource_id, read_at, created_at',
      )
      .order('created_at', ascending: false)
      .limit(40);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _markRead(WidgetRef ref, String id) async {
    await ref.read(supabaseClientProvider).from('notifications').update({
      'read_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
    ref.invalidate(notificationsProvider);
  }

  Future<void> _markAll(WidgetRef ref) async {
    await ref.read(supabaseClientProvider).from('notifications').update({
      'read_at': DateTime.now().toIso8601String(),
    }).isFilter('read_at', null);
    ref.invalidate(notificationsProvider);
  }

  void _open(BuildContext context, Map<String, dynamic> n) {
    final type = n['resource_type'] as String?;
    final id = n['resource_id'] as String?;
    if (type == 'event' && id != null) {
      context.push('/events/$id');
    } else if (type == 'task') {
      context.go('/tasks');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return FeatureScaffold(
      title: 'Notifications',
      actions: [
        TextButton(
          onPressed: () => _markAll(ref),
          child: const Text('Mark all read'),
        ),
      ],
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Text(
                'No notifications yet.',
                style: TextStyle(color: DayPilotColors.textSecondary),
              ),
            );
          }
          return RefreshIndicator(
            color: DayPilotColors.brand500,
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final n = list[i];
                final unread = n['read_at'] == null;
                final created = DateTime.tryParse('${n['created_at']}');
                return Material(
                  color: unread
                      ? DayPilotColors.brand500.withValues(alpha: 0.08)
                      : DayPilotColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      if (unread) await _markRead(ref, n['id'] as String);
                      if (context.mounted) _open(context, n);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: DayPilotColors.borderSubtle),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (unread)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(right: 8),
                                  decoration: const BoxDecoration(
                                    color: DayPilotColors.brand500,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              Expanded(
                                child: Text(
                                  '${n['title']}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              if (created != null)
                                Text(
                                  DateFormat.MMMd()
                                      .add_jm()
                                      .format(created.toLocal()),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: DayPilotColors.textTertiary,
                                  ),
                                ),
                            ],
                          ),
                          if ((n['body'] as String?)?.isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(
                              '${n['body']}',
                              style: const TextStyle(
                                color: DayPilotColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
