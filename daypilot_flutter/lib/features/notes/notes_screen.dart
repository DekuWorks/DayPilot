import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

final notesListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('notes')
      .select('id, title, content, updated_at')
      .isFilter('archived_at', null)
      .order('updated_at', ascending: false);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

class NotesScreen extends ConsumerWidget {
  const NotesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notesListProvider);
    return FeatureScaffold(
      title: 'Notes',
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final client = ref.read(supabaseClientProvider);
          final uid = client.auth.currentUser?.id;
          if (uid == null) return;
          final row = await client
              .from('notes')
              .insert({
                'user_id': uid,
                'title': 'Untitled',
                'content': '',
                'content_format': 'markdown',
              })
              .select('id')
              .single();
          ref.invalidate(notesListProvider);
          if (context.mounted) {
            context.push('/notes/${row['id']}');
          }
        },
        child: const Icon(Icons.add_rounded),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (notes) {
          if (notes.isEmpty) {
            return const Center(
              child: Text(
                'No notes yet. Tap + to write one.',
                style: TextStyle(color: DayPilotColors.textSecondary),
              ),
            );
          }
          return RefreshIndicator(
            color: DayPilotColors.brand500,
            onRefresh: () async => ref.invalidate(notesListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notes.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final n = notes[i];
                final updated = DateTime.tryParse('${n['updated_at']}');
                return NavTile(
                  icon: Icons.sticky_note_2_outlined,
                  title: (n['title'] as String?)?.trim().isNotEmpty == true
                      ? n['title'] as String
                      : 'Untitled',
                  subtitle: updated != null
                      ? DateFormat.MMMd().add_jm().format(updated.toLocal())
                      : null,
                  onTap: () => context.push('/notes/${n['id']}'),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class NoteEditorScreen extends ConsumerStatefulWidget {
  const NoteEditorScreen({super.key, required this.noteId});

  final String noteId;

  @override
  ConsumerState<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends ConsumerState<NoteEditorScreen> {
  final _title = TextEditingController();
  final _content = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client = ref.read(supabaseClientProvider);
    final row = await client
        .from('notes')
        .select('title, content')
        .eq('id', widget.noteId)
        .maybeSingle();
    if (!mounted) return;
    _title.text = (row?['title'] as String?) ?? '';
    _content.text = (row?['content'] as String?) ?? '';
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(supabaseClientProvider).from('notes').update({
        'title': _title.text.trim().isEmpty ? 'Untitled' : _title.text.trim(),
        'content': _content.text,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.noteId);
      ref.invalidate(notesListProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Note saved')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _archive() async {
    await ref.read(supabaseClientProvider).from('notes').update({
      'archived_at': DateTime.now().toIso8601String(),
    }).eq('id', widget.noteId);
    ref.invalidate(notesListProvider);
    if (mounted) context.pop();
  }

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Note',
      actions: [
        IconButton(
          tooltip: 'Archive',
          onPressed: _loading ? null : _archive,
          icon: const Icon(Icons.archive_outlined),
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
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _content,
                  decoration: const InputDecoration(
                    hintText: 'Write something…',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                  ),
                  minLines: 12,
                  maxLines: null,
                ),
              ],
            ),
    );
  }
}
