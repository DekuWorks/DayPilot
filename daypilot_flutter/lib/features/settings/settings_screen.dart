import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_mode_provider.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../core/widgets/profile_avatar.dart';
import '../../data/services/avatar_upload_service.dart';
import '../profile/profile_providers.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _username = TextEditingController();
  String? _avatarUrl;
  bool _loading = true;
  bool _saving = false;
  bool _uploading = false;
  String? _message;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;
    final row = await client
        .from('profiles')
        .select('first_name, last_name, username, avatar_url')
        .eq('id', uid)
        .maybeSingle();
    if (!mounted) return;
    _first.text = (row?['first_name'] as String?) ?? '';
    _last.text = (row?['last_name'] as String?) ?? '';
    _username.text = (row?['username'] as String?) ?? '';
    _avatarUrl = resolveAvatarUrl(
      row,
      client.auth.currentUser,
    );
    setState(() => _loading = false);
  }

  String _normalizeUsername(String raw) {
    return raw.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '');
  }

  Future<void> _uploadAvatar() async {
    setState(() {
      _uploading = true;
      _message = null;
      _error = false;
    });
    try {
      final service = AvatarUploadService(ref.read(supabaseClientProvider));
      final picked = await service.pickFromGallery();
      if (picked == null) return;
      final url = await service.uploadPicked(picked);
      ref.invalidate(currentProfileProvider);
      if (!mounted) return;
      setState(() {
        _avatarUrl = url;
        _message = 'Photo saved.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = true;
        _message = e.toString();
      });
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _message = null;
      _error = false;
    });
    try {
      final client = ref.read(supabaseClientProvider);
      final uid = client.auth.currentUser?.id;
      if (uid == null) throw StateError('Not signed in');
      final first = _first.text.trim();
      final last = _last.text.trim();
      final handle = _normalizeUsername(_username.text);
      if (first.isEmpty) throw Exception('First name is required');
      if (_username.text.trim().isNotEmpty && handle.length < 3) {
        throw Exception('Username must be at least 3 characters (a-z, 0-9, _)');
      }
      final legal = [first, last].where((s) => s.isNotEmpty).join(' ');
      await client.from('profiles').update({
        'first_name': first,
        'last_name': last.isEmpty ? null : last,
        'username': handle.isEmpty ? null : handle,
        'avatar_url': _avatarUrl,
        'display_name': legal,
        'name': legal,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', uid);
      ref.invalidate(currentProfileProvider);
      setState(() => _message = 'Profile updated.');
    } catch (e) {
      setState(() {
        _error = true;
        _message = e.toString().contains('23505')
            ? 'That username is already taken'
            : e.toString();
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _username.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final themeMode = ref.watch(themeModeProvider);
    final display = [_first.text.trim(), _last.text.trim()]
        .where((s) => s.isNotEmpty)
        .join(' ');
    return FeatureScaffold(
      title: 'Settings',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Appearance',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Light mode'),
                  value: themeMode == ThemeMode.light,
                  activeThumbColor: colors.accent,
                  onChanged: (v) =>
                      ref.read(themeModeProvider.notifier).setLight(v),
                ),
                const SizedBox(height: 16),
                Text(
                  'Profile',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ProfileAvatar(
                      initials: profileInitials(
                        display.isEmpty ? 'P' : display,
                      ),
                      imageUrl: _avatarUrl,
                      radius: 32,
                      onTap: _uploading ? null : _uploadAvatar,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _uploading ? null : _uploadAvatar,
                        icon: _uploading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.photo_outlined),
                        label: Text(
                          _uploading ? 'Uploading…' : 'Change photo',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _first,
                  decoration: const InputDecoration(labelText: 'First name'),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _last,
                  decoration: const InputDecoration(labelText: 'Last name'),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _username,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    prefixText: '@',
                  ),
                ),
                const SizedBox(height: 20),
                if (_message != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _message!,
                      style: TextStyle(
                        color: _error
                            ? DayPilotColors.error
                            : colors.accent,
                      ),
                    ),
                  ),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving…' : 'Save changes'),
                ),
              ],
            ),
    );
  }
}
