import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'tasks_screen.dart';

/// Task detail — title, notes, priority, due, project, mark complete, subtasks.
class TaskDetailScreen extends ConsumerStatefulWidget {
  const TaskDetailScreen({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _subCtrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String _status = 'pending';
  String _priority = 'medium';
  DateTime? _dueAt;
  String? _projectId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final row = await ref
        .read(supabaseClientProvider)
        .from('tasks')
        .select(
          'id, title, status, priority, due_at, description, project_id',
        )
        .eq('id', widget.taskId)
        .maybeSingle();
    if (!mounted) return;
    if (row == null) {
      setState(() => _loading = false);
      return;
    }
    _title.text = (row['title'] as String?) ?? '';
    _desc.text = (row['description'] as String?) ?? '';
    _status = (row['status'] as String?) ?? 'pending';
    _priority = (row['priority'] as String?) ?? 'medium';
    _dueAt = row['due_at'] != null
        ? DateTime.tryParse(row['due_at'] as String)
        : null;
    _projectId = row['project_id'] as String?;
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(supabaseClientProvider).from('tasks').update({
        'title': _title.text.trim().isEmpty ? 'Untitled' : _title.text.trim(),
        'description': _desc.text.trim().isEmpty ? null : _desc.text.trim(),
        'priority': _priority,
        'due_at': _dueAt?.toIso8601String(),
        'project_id': _projectId,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.taskId);
      ref.invalidate(tasksListProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleComplete() async {
    final done = _status == 'completed';
    final next = done ? 'pending' : 'completed';
    await ref.read(supabaseClientProvider).from('tasks').update({
      'status': next,
      'completed_at': done ? null : DateTime.now().toIso8601String(),
    }).eq('id', widget.taskId);
    setState(() => _status = next);
    ref.invalidate(tasksListProvider);
  }

  Future<void> _pickDue() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueAt ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked == null) return;
    setState(() {
      _dueAt = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
    });
  }

  Future<void> _addSubtask(List<SubtaskRow> kids) async {
    final text = _subCtrl.text.trim();
    if (text.isEmpty) return;
    await ref.read(supabaseClientProvider).from('subtasks').insert({
      'task_id': widget.taskId,
      'title': text,
      'status': 'pending',
      'position': kids.length + 1,
    });
    _subCtrl.clear();
    ref.invalidate(subtasksListProvider);
  }

  Future<void> _toggleSub(SubtaskRow s) async {
    await ref.read(supabaseClientProvider).from('subtasks').update({
      'status': s.isDone ? 'pending' : 'completed',
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', s.id);
    ref.invalidate(subtasksListProvider);
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete task?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await ref
        .read(supabaseClientProvider)
        .from('tasks')
        .delete()
        .eq('id', widget.taskId);
    ref.invalidate(tasksListProvider);
    ref.invalidate(subtasksListProvider);
    if (mounted) context.pop();
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _subCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final projects = ref.watch(taskProjectsProvider).maybeWhen(
          data: (d) => d,
          orElse: () => const <TaskProject>[],
        );
    final kids = ref.watch(subtasksListProvider).maybeWhen(
          data: (all) =>
              all.where((s) => s.taskId == widget.taskId).toList(),
          orElse: () => const <SubtaskRow>[],
        );
    final done = _status == 'completed';

    return FeatureScaffold(
      title: 'Task',
      fallbackRoute: '/tasks',
      actions: [
        IconButton(
          onPressed: _loading ? null : _delete,
          icon: Icon(Icons.delete_outline),
        ),
        TextButton(
          onPressed: _loading || _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Save'),
        ),
      ],
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _title,
                  decoration: const InputDecoration(hintText: 'Title'),
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _desc,
                  decoration: const InputDecoration(
                    labelText: 'Notes',
                    alignLabelWithHint: true,
                  ),
                  minLines: 3,
                  maxLines: 8,
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Priority'),
                  trailing: DropdownButton<String>(
                    value: ['low', 'medium', 'high', 'urgent']
                            .contains(_priority)
                        ? _priority
                        : 'medium',
                    items: const [
                      DropdownMenuItem(value: 'low', child: Text('low')),
                      DropdownMenuItem(value: 'medium', child: Text('medium')),
                      DropdownMenuItem(value: 'high', child: Text('high')),
                      DropdownMenuItem(value: 'urgent', child: Text('urgent')),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _priority = v);
                    },
                  ),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Due date'),
                  subtitle: Text(
                    _dueAt == null
                        ? 'None'
                        : DateFormat.yMMMd().format(_dueAt!),
                  ),
                  trailing: Icon(Icons.calendar_today_outlined),
                  onTap: _pickDue,
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Project'),
                  trailing: DropdownButton<String?>(
                    value: _projectId,
                    hint: Text('No project'),
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
                    onChanged: (v) => setState(() => _projectId = v),
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: _toggleComplete,
                  icon: Icon(
                    done
                        ? Icons.undo_rounded
                        : Icons.check_circle_outline_rounded,
                  ),
                  label: Text(done ? 'Mark incomplete' : 'Mark complete'),
                ),
                const SizedBox(height: 24),
                Text(
                  'Subtasks',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                for (final s in kids)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: IconButton(
                      onPressed: () => _toggleSub(s),
                      icon: Icon(
                        s.isDone
                            ? Icons.check_box_rounded
                            : Icons.check_box_outline_blank,
                        color: s.isDone
                            ? context.dp.accent
                            : DayPilotScheme.of(context).textTertiary,
                      ),
                    ),
                    title: Text(
                      s.title,
                      style: TextStyle(
                        decoration:
                            s.isDone ? TextDecoration.lineThrough : null,
                        color: s.isDone
                            ? DayPilotScheme.of(context).textTertiary
                            : DayPilotScheme.of(context).textPrimary,
                      ),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _subCtrl,
                        decoration: const InputDecoration(
                          hintText: 'Add subtask…',
                          isDense: true,
                        ),
                        onSubmitted: (_) => _addSubtask(kids),
                      ),
                    ),
                    IconButton(
                      onPressed: () => _addSubtask(kids),
                      icon: Icon(Icons.add),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}
