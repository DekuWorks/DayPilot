import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

class SearchHit {
  const SearchHit({
    required this.kind,
    required this.id,
    required this.title,
    this.subtitle,
  });

  final String kind;
  final String id;
  final String title;
  final String? subtitle;
}

/// Quick search across tasks, notes, and contacts (web ⌘K equivalent).
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _query = TextEditingController();
  List<SearchHit> _hits = const [];
  bool _loading = false;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _run(String raw) async {
    final q = raw.trim().toLowerCase();
    if (q.length < 2) {
      setState(() => _hits = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final client = ref.read(supabaseClientProvider);
      final results = <SearchHit>[];

      final tasks = await client
          .from('tasks')
          .select('id, title, status')
          .ilike('title', '%$q%')
          .limit(12);
      for (final r in tasks as List) {
        final m = Map<String, dynamic>.from(r as Map);
        results.add(
          SearchHit(
            kind: 'task',
            id: m['id'] as String,
            title: '${m['title']}',
            subtitle: 'Task · ${m['status']}',
          ),
        );
      }

      final notes = await client
          .from('notes')
          .select('id, title')
          .isFilter('archived_at', null)
          .ilike('title', '%$q%')
          .limit(12);
      for (final r in notes as List) {
        final m = Map<String, dynamic>.from(r as Map);
        results.add(
          SearchHit(
            kind: 'note',
            id: m['id'] as String,
            title: (m['title'] as String?)?.trim().isNotEmpty == true
                ? m['title'] as String
                : 'Untitled',
            subtitle: 'Note',
          ),
        );
      }

      final contacts = await client
          .from('contacts')
          .select('id, name, email, company')
          .or('name.ilike.%$q%,email.ilike.%$q%,company.ilike.%$q%')
          .limit(12);
      for (final r in contacts as List) {
        final m = Map<String, dynamic>.from(r as Map);
        results.add(
          SearchHit(
            kind: 'contact',
            id: m['id'] as String,
            title: '${m['name']}',
            subtitle: [
              'Contact',
              if ((m['company'] as String?)?.isNotEmpty == true) m['company'],
            ].join(' · '),
          ),
        );
      }

      if (mounted) setState(() => _hits = results);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _open(SearchHit hit) {
    switch (hit.kind) {
      case 'task':
        context.push('/tasks/${hit.id}');
      case 'note':
        context.push('/notes/${hit.id}');
      case 'contact':
        context.push('/contacts/${hit.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Search',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _query,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Search tasks, notes, contacts…',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              textInputAction: TextInputAction.search,
              onChanged: _run,
              onSubmitted: _run,
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: _hits.isEmpty
                ? Center(
                    child: Text(
                      _query.text.trim().length < 2
                          ? 'Type at least 2 characters'
                          : 'No matches',
                      style: const TextStyle(color: DayPilotColors.textSecondary),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _hits.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final h = _hits[i];
                      final icon = switch (h.kind) {
                        'task' => Icons.check_circle_outline,
                        'note' => Icons.sticky_note_2_outlined,
                        _ => Icons.person_outline,
                      };
                      return NavTile(
                        icon: icon,
                        title: h.title,
                        subtitle: h.subtitle,
                        onTap: () => _open(h),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
