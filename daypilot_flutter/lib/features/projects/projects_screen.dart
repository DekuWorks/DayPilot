import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

const _colors = ['#42E85F', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7'];

final projectsListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('projects')
      .select('id, name, description, status, color, progress')
      .neq('status', 'archived')
      .order('updated_at', ascending: false);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  Future<void> _create() async {
    final nameCtrl = TextEditingController();
    var color = _colors.first;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('New project'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(hintText: 'Project name'),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  for (final c in _colors)
                    GestureDetector(
                      onTap: () => setLocal(() => color = c),
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Color(
                            int.parse(c.substring(1), radix: 16) + 0xFF000000,
                          ),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: color == c
                                ? DayPilotColors.textPrimary
                                : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
    if (ok != true || nameCtrl.text.trim().isEmpty) return;
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    await client.from('projects').insert({
      'owner_id': uid,
      'name': nameCtrl.text.trim(),
      'color': color,
      'status': 'active',
    });
    ref.invalidate(projectsListProvider);
  }

  Future<void> _cycleStatus(Map<String, dynamic> p) async {
    const order = ['active', 'on_hold', 'completed'];
    final cur = (p['status'] as String?) ?? 'active';
    final next = order[(order.indexOf(cur) + 1) % order.length];
    await ref.read(supabaseClientProvider).from('projects').update({
      'status': next,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', p['id']);
    ref.invalidate(projectsListProvider);
  }

  Future<void> _archive(String id) async {
    await ref.read(supabaseClientProvider).from('projects').update({
      'status': 'archived',
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
    ref.invalidate(projectsListProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(projectsListProvider);
    return FeatureScaffold(
      title: 'Projects',
      floatingActionButton: FloatingActionButton(
        onPressed: _create,
        child: const Icon(Icons.add_rounded),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Text(
                'No projects yet.',
                style: TextStyle(color: DayPilotColors.textSecondary),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final p = list[i];
              final hex = (p['color'] as String?) ?? '#42E85F';
              Color color;
              try {
                color = Color(
                  int.parse(hex.substring(1), radix: 16) + 0xFF000000,
                );
              } catch (_) {
                color = DayPilotColors.brand500;
              }
              return Container(
                decoration: BoxDecoration(
                  color: DayPilotColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: DayPilotColors.borderSubtle),
                ),
                child: ListTile(
                  leading: Container(
                    width: 12,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  title: Text(
                    '${p['name']}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    '${p['status']}'.replaceAll('_', ' '),
                    style: const TextStyle(color: DayPilotColors.textSecondary),
                  ),
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'status') _cycleStatus(p);
                      if (v == 'archive') _archive(p['id'] as String);
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(
                        value: 'status',
                        child: Text('Cycle status'),
                      ),
                      PopupMenuItem(value: 'archive', child: Text('Archive')),
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
