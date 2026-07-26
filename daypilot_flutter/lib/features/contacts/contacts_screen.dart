import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';

final contactsListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final rows = await ref
      .watch(supabaseClientProvider)
      .from('contacts')
      .select('id, name, email, phone, company, notes')
      .order('name', ascending: true);
  return (rows as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

class ContactsScreen extends ConsumerStatefulWidget {
  const ContactsScreen({super.key});

  @override
  ConsumerState<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends ConsumerState<ContactsScreen> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final email = TextEditingController();
    final phone = TextEditingController();
    final company = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New contact'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name'),
                autofocus: true,
              ),
              TextField(
                controller: email,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              TextField(
                controller: phone,
                decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: company,
                decoration: const InputDecoration(labelText: 'Company'),
              ),
            ],
          ),
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
    );
    if (ok != true || name.text.trim().isEmpty) return;
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    final row = await client
        .from('contacts')
        .insert({
          'user_id': uid,
          'name': name.text.trim(),
          'email': email.text.trim().isEmpty ? null : email.text.trim(),
          'phone': phone.text.trim().isEmpty ? null : phone.text.trim(),
          'company': company.text.trim().isEmpty ? null : company.text.trim(),
        })
        .select('id')
        .single();
    ref.invalidate(contactsListProvider);
    if (mounted) context.push('/contacts/${row['id']}');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(contactsListProvider);
    final q = _query.text.trim().toLowerCase();
    return FeatureScaffold(
      title: 'Contacts',
      floatingActionButton: FloatingActionButton(
        onPressed: _create,
        child: const Icon(Icons.person_add_alt_1_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _query,
              decoration: const InputDecoration(
                hintText: 'Search contacts…',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
              data: (all) {
                final list = q.isEmpty
                    ? all
                    : all.where((c) {
                        final hay =
                            '${c['name']} ${c['email']} ${c['company']}'
                                .toLowerCase();
                        return hay.contains(q);
                      }).toList();
                if (list.isEmpty) {
                  return const Center(
                    child: Text(
                      'No contacts yet.',
                      style: TextStyle(color: DayPilotColors.textSecondary),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final c = list[i];
                    return NavTile(
                      icon: Icons.person_outline_rounded,
                      title: '${c['name']}',
                      subtitle: [
                        if ((c['company'] as String?)?.isNotEmpty == true)
                          c['company'],
                        if ((c['email'] as String?)?.isNotEmpty == true)
                          c['email'],
                      ].whereType<String>().join(' · '),
                      onTap: () => context.push('/contacts/${c['id']}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ContactDetailScreen extends ConsumerStatefulWidget {
  const ContactDetailScreen({super.key, required this.contactId});

  final String contactId;

  @override
  ConsumerState<ContactDetailScreen> createState() =>
      _ContactDetailScreenState();
}

class _ContactDetailScreenState extends ConsumerState<ContactDetailScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _company = TextEditingController();
  final _notes = TextEditingController();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final row = await ref
        .read(supabaseClientProvider)
        .from('contacts')
        .select('name, email, phone, company, notes')
        .eq('id', widget.contactId)
        .maybeSingle();
    if (!mounted) return;
    _name.text = (row?['name'] as String?) ?? '';
    _email.text = (row?['email'] as String?) ?? '';
    _phone.text = (row?['phone'] as String?) ?? '';
    _company.text = (row?['company'] as String?) ?? '';
    _notes.text = (row?['notes'] as String?) ?? '';
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    await ref.read(supabaseClientProvider).from('contacts').update({
      'name': _name.text.trim(),
      'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
      'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      'company': _company.text.trim().isEmpty ? null : _company.text.trim(),
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', widget.contactId);
    ref.invalidate(contactsListProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact saved')),
      );
    }
  }

  Future<void> _delete() async {
    await ref
        .read(supabaseClientProvider)
        .from('contacts')
        .delete()
        .eq('id', widget.contactId);
    ref.invalidate(contactsListProvider);
    if (mounted) context.pop();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _company.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Contact',
      actions: [
        IconButton(
          onPressed: _loading ? null : _delete,
          icon: const Icon(Icons.delete_outline),
        ),
        TextButton(onPressed: _loading ? null : _save, child: const Text('Save')),
      ],
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _company,
                  decoration: const InputDecoration(labelText: 'Company'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _notes,
                  decoration: const InputDecoration(labelText: 'Notes'),
                  minLines: 3,
                  maxLines: 6,
                ),
              ],
            ),
    );
  }
}
