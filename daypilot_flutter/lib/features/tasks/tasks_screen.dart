import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import 'task_models.dart';

export 'task_models.dart';

final tasksListProvider =
    FutureProvider.autoDispose<List<TaskRow>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('tasks')
      .select('id, title, status, priority, due_at, description, project_id')
      .order('created_at', ascending: false);
  return (rows as List).map((r) {
    final m = Map<String, dynamic>.from(r as Map);
    return TaskRow(
      id: m['id'] as String,
      title: (m['title'] as String?) ?? '',
      status: (m['status'] as String?) ?? 'pending',
      priority: (m['priority'] as String?) ?? 'medium',
      dueAt:
          m['due_at'] != null ? DateTime.tryParse(m['due_at'] as String) : null,
      description: m['description'] as String?,
      projectId: m['project_id'] as String?,
    );
  }).toList();
});

final subtasksListProvider =
    FutureProvider.autoDispose<List<SubtaskRow>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('subtasks')
      .select('id, task_id, title, status, position')
      .order('position', ascending: true);
  return (rows as List).map((r) {
    final m = Map<String, dynamic>.from(r as Map);
    return SubtaskRow(
      id: m['id'] as String,
      taskId: m['task_id'] as String,
      title: (m['title'] as String?) ?? '',
      status: (m['status'] as String?) ?? 'pending',
      position: (m['position'] as num?)?.toInt() ?? 0,
    );
  }).toList();
});

final taskProjectsProvider =
    FutureProvider.autoDispose<List<TaskProject>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('projects')
      .select('id, name, color')
      .neq('status', 'archived')
      .order('name');
  return (rows as List).map((r) {
    final m = Map<String, dynamic>.from(r as Map);
    return TaskProject(
      id: m['id'] as String,
      name: (m['name'] as String?) ?? 'Project',
      color: (m['color'] as String?) ?? '#42E85F',
    );
  }).toList();
});

/// Tasks tab — All/Today/Upcoming/Completed, projects, subtasks.
class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  TaskFilter _filter = TaskFilter.today;
  final _titleCtrl = TextEditingController();
  final _expanded = <String>{};
  final _subDraft = <String, TextEditingController>{};
  String _newPriority = 'medium';
  String? _newProjectId;
  DateTime? _newDue;

  @override
  void initState() {
    super.initState();
    final n = DateTime.now();
    _newDue = DateTime(n.year, n.month, n.day);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    for (final c in _subDraft.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _draftFor(String taskId) {
    return _subDraft.putIfAbsent(taskId, TextEditingController.new);
  }

  List<TaskRow> _visible(List<TaskRow> all) {
    final start = DateTime.now();
    final dayStart = DateTime(start.year, start.month, start.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    return all.where((t) {
      switch (_filter) {
        case TaskFilter.all:
          return t.status != 'cancelled';
        case TaskFilter.completed:
          return t.isDone;
        case TaskFilter.today:
          if (t.isDone) return false;
          if (t.dueAt == null) return true;
          return !t.dueAt!.isBefore(dayStart) && t.dueAt!.isBefore(dayEnd);
        case TaskFilter.upcoming:
          if (t.isDone || t.dueAt == null) return false;
          return !t.dueAt!.isBefore(dayEnd);
      }
    }).toList();
  }

  Future<void> _toggle(TaskRow task) async {
    final done = task.isDone;
    await ref.read(supabaseClientProvider).from('tasks').update({
      'status': done ? 'pending' : 'completed',
      'completed_at': done ? null : DateTime.now().toIso8601String(),
    }).eq('id', task.id);
    ref.invalidate(tasksListProvider);
  }

  Future<void> _add() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    final due = _newDue == null
        ? null
        : DateTime(_newDue!.year, _newDue!.month, _newDue!.day, 23, 59, 59);
    await client.from('tasks').insert({
      'user_id': uid,
      'title': title,
      'status': 'pending',
      'priority': _newPriority,
      'due_at': due?.toIso8601String(),
      'project_id': _newProjectId,
    });
    _titleCtrl.clear();
    setState(() {
      _newPriority = 'medium';
      _newProjectId = null;
      final n = DateTime.now();
      _newDue = DateTime(n.year, n.month, n.day);
    });
    ref.invalidate(tasksListProvider);
  }

  Future<void> _pickNewDue() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _newDue ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked != null) setState(() => _newDue = picked);
  }

  Future<void> _cyclePriority(TaskRow task) async {
    const order = ['low', 'medium', 'high', 'urgent'];
    final idx = order.indexOf(task.priority);
    final next = order[(idx < 0 ? 1 : idx + 1) % order.length];
    try {
      await ref
          .read(supabaseClientProvider)
          .from('tasks')
          .update({'priority': next}).eq('id', task.id);
      ref.invalidate(tasksListProvider);
    } catch (_) {
      // DB may only allow low/medium/high — fall back
      final fallback = ['low', 'medium', 'high'];
      final fi = fallback.indexOf(task.priority);
      final fn = fallback[(fi < 0 ? 1 : fi + 1) % fallback.length];
      await ref
          .read(supabaseClientProvider)
          .from('tasks')
          .update({'priority': fn}).eq('id', task.id);
      ref.invalidate(tasksListProvider);
    }
  }

  Future<void> _pickDue(TaskRow task) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: task.dueAt ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked == null) return;
    final due = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
    await ref.read(supabaseClientProvider).from('tasks').update({
      'due_at': due.toIso8601String(),
    }).eq('id', task.id);
    ref.invalidate(tasksListProvider);
  }

  Future<void> _assignProject(TaskRow task, List<TaskProject> projects) async {
    final chosen = await showModalBottomSheet<String?>(
      context: context,
      backgroundColor: DayPilotScheme.of(context).surfacePrimary,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const ListTile(
              title: Text(
                'Assign project',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            ListTile(
              title: Text('No project'),
              onTap: () => Navigator.pop(context, ''),
            ),
            for (final p in projects)
              ListTile(
                leading: CircleAvatar(
                  radius: 8,
                  backgroundColor: _parseColor(p.color),
                ),
                title: Text(p.name),
                selected: p.id == task.projectId,
                onTap: () => Navigator.pop(context, p.id),
              ),
          ],
        ),
      ),
    );
    if (chosen == null) return;
    await ref.read(supabaseClientProvider).from('tasks').update({
      'project_id': chosen.isEmpty ? null : chosen,
    }).eq('id', task.id);
    ref.invalidate(tasksListProvider);
  }

  Future<void> _delete(TaskRow task) async {
    await ref
        .read(supabaseClientProvider)
        .from('tasks')
        .delete()
        .eq('id', task.id);
    ref.invalidate(tasksListProvider);
    ref.invalidate(subtasksListProvider);
  }

  Future<void> _addSubtask(String taskId, List<SubtaskRow> kids) async {
    final text = _draftFor(taskId).text.trim();
    if (text.isEmpty) return;
    await ref.read(supabaseClientProvider).from('subtasks').insert({
      'task_id': taskId,
      'title': text,
      'status': 'pending',
      'position': kids.length + 1,
    });
    _draftFor(taskId).clear();
    ref.invalidate(subtasksListProvider);
  }

  Future<void> _toggleSub(SubtaskRow s) async {
    await ref.read(supabaseClientProvider).from('subtasks').update({
      'status': s.isDone ? 'pending' : 'completed',
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', s.id);
    ref.invalidate(subtasksListProvider);
  }

  Color _parseColor(String hex) {
    try {
      return Color(int.parse(hex.substring(1), radix: 16) + 0xFF000000);
    } catch (_) {
      return context.dp.accent;
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(tasksListProvider);
    final projects = ref.watch(taskProjectsProvider).maybeWhen(
          data: (d) => d,
          orElse: () => const <TaskProject>[],
        );
    final projectName = {
      for (final p in projects) p.id: p.name,
    };
    final subs = ref.watch(subtasksListProvider).maybeWhen(
          data: (d) => d,
          orElse: () => const <SubtaskRow>[],
        );
    final byTask = <String, List<SubtaskRow>>{};
    for (final s in subs) {
      (byTask[s.taskId] ??= []).add(s);
    }

    return Scaffold(
      backgroundColor: DayPilotScheme.of(context).backgroundPrimary,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text(
                'Tasks',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: DayPilotScheme.of(context).textPrimary,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                'Priorities, projects, and subtasks',
                style: TextStyle(
                  color: DayPilotScheme.of(context).textSecondary,
                  fontSize: 13,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final f in TaskFilter.values)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(switch (f) {
                            TaskFilter.all => 'All',
                            TaskFilter.today => 'Today',
                            TaskFilter.upcoming => 'Upcoming',
                            TaskFilter.completed => 'Completed',
                          }),
                          selected: _filter == f,
                          onSelected: (_) => setState(() => _filter = f),
                          showCheckmark: false,
                          color: WidgetStateProperty.resolveWith((states) {
                            if (states.contains(WidgetState.selected)) {
                              return context.dp.accent;
                            }
                            return context.dp.surfaceSecondary;
                          }),
                          labelStyle: TextStyle(
                            color: _filter == f
                                ? (Theme.of(context).brightness ==
                                        Brightness.dark
                                    ? context.dp.textInverse
                                    : Colors.white)
                                : context.dp.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                          side: BorderSide(
                            color: _filter == f
                                ? context.dp.accent
                                : context.dp.borderSubtle,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _titleCtrl,
                          decoration: const InputDecoration(
                            hintText: 'New task',
                            isDense: true,
                          ),
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _add(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _add,
                        child: Text('Add'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ActionChip(
                        label: Text(
                          _newDue == null
                              ? 'Due'
                              : DateFormat.MMMd().format(_newDue!),
                        ),
                        onPressed: _pickNewDue,
                      ),
                      const SizedBox(width: 8),
                      DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _newPriority,
                          items: const [
                            DropdownMenuItem(value: 'low', child: Text('low')),
                            DropdownMenuItem(
                              value: 'medium',
                              child: Text('medium'),
                            ),
                            DropdownMenuItem(
                              value: 'high',
                              child: Text('high'),
                            ),
                            DropdownMenuItem(
                              value: 'urgent',
                              child: Text('urgent'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _newPriority = v);
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String?>(
                            isExpanded: true,
                            value: _newProjectId,
                            hint: Text(
                              'No project',
                              style: TextStyle(fontSize: 13),
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('No project'),
                              ),
                              for (final p in projects)
                                DropdownMenuItem<String?>(
                                  value: p.id,
                                  child: Text(p.name),
                                ),
                            ],
                            onChanged: (v) =>
                                setState(() => _newProjectId = v),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: async.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('$e')),
                data: (all) {
                  final list = _visible(all);
                  if (list.isEmpty) {
                    return Center(
                      child: Text(
                        'No tasks here yet.',
                        style: TextStyle(color: DayPilotScheme.of(context).textSecondary),
                      ),
                    );
                  }
                  return RefreshIndicator(
                    color: context.dp.accent,
                    onRefresh: () async {
                      ref.invalidate(tasksListProvider);
                      ref.invalidate(subtasksListProvider);
                      ref.invalidate(taskProjectsProvider);
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final t = list[i];
                        final kids = byTask[t.id] ?? const <SubtaskRow>[];
                        final open = _expanded.contains(t.id);
                        final proj = t.projectId == null
                            ? null
                            : projectName[t.projectId!];
                        return Container(
                          decoration: BoxDecoration(
                            color: DayPilotScheme.of(context).surfacePrimary,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: DayPilotScheme.of(context).borderSubtle,
                            ),
                          ),
                          child: Column(
                            children: [
                              ListTile(
                                onTap: () => context.push('/tasks/${t.id}'),
                                leading: IconButton(
                                  onPressed: () => _toggle(t),
                                  icon: Icon(
                                    t.isDone
                                        ? Icons.check_circle_rounded
                                        : Icons.circle_outlined,
                                    color: t.isDone
                                        ? context.dp.accent
                                        : DayPilotScheme.of(context).textTertiary,
                                  ),
                                ),
                                title: Text(
                                  t.title,
                                  style: TextStyle(
                                    decoration: t.isDone
                                        ? TextDecoration.lineThrough
                                        : null,
                                    color: t.isDone
                                        ? DayPilotScheme.of(context).textTertiary
                                        : DayPilotScheme.of(context).textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  [
                                    if (t.dueAt != null)
                                      DateFormat.MMMd().format(t.dueAt!),
                                    t.priority,
                                    ?proj,
                                    if (kids.isNotEmpty)
                                      '${kids.where((k) => k.isDone).length}/${kids.length} sub',
                                  ].join(' · '),
                                  style: TextStyle(
                                    color: DayPilotScheme.of(context).textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: 'Subtasks',
                                      onPressed: () => setState(() {
                                        if (open) {
                                          _expanded.remove(t.id);
                                        } else {
                                          _expanded.add(t.id);
                                        }
                                      }),
                                      icon: Icon(
                                        open
                                            ? Icons.expand_less
                                            : Icons.expand_more,
                                        color: context.dp.accent,
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      onSelected: (v) {
                                        if (v == 'priority') {
                                          _cyclePriority(t);
                                        }
                                        if (v == 'due') _pickDue(t);
                                        if (v == 'project') {
                                          _assignProject(t, projects);
                                        }
                                        if (v == 'delete') _delete(t);
                                      },
                                      itemBuilder: (_) => const [
                                        PopupMenuItem(
                                          value: 'priority',
                                          child: Text('Cycle priority'),
                                        ),
                                        PopupMenuItem(
                                          value: 'due',
                                          child: Text('Set due date'),
                                        ),
                                        PopupMenuItem(
                                          value: 'project',
                                          child: Text('Assign project'),
                                        ),
                                        PopupMenuItem(
                                          value: 'delete',
                                          child: Text('Delete'),
                                        ),
                                      ],
                                      child: Padding(
                                        padding: const EdgeInsets.all(8),
                                        child: PriorityDot(
                                          priority: t.priority,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (open) ...[
                                const Divider(height: 1),
                                for (final s in kids)
                                  ListTile(
                                    dense: true,
                                    leading: IconButton(
                                      onPressed: () => _toggleSub(s),
                                      icon: Icon(
                                        s.isDone
                                            ? Icons.check_box_rounded
                                            : Icons.check_box_outline_blank,
                                        color: s.isDone
                                            ? context.dp.accent
                                            : DayPilotScheme.of(context).textTertiary,
                                        size: 20,
                                      ),
                                    ),
                                    title: Text(
                                      s.title,
                                      style: TextStyle(
                                        decoration: s.isDone
                                            ? TextDecoration.lineThrough
                                            : null,
                                        color: s.isDone
                                            ? DayPilotScheme.of(context).textTertiary
                                            : DayPilotScheme.of(context).textPrimary,
                                      ),
                                    ),
                                  ),
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(
                                    16,
                                    0,
                                    16,
                                    12,
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: _draftFor(t.id),
                                          decoration: const InputDecoration(
                                            hintText: 'Add subtask…',
                                            isDense: true,
                                          ),
                                          onSubmitted: (_) =>
                                              _addSubtask(t.id, kids),
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: () =>
                                            _addSubtask(t.id, kids),
                                        icon: Icon(
                                          Icons.add,
                                          color: context.dp.accent,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
