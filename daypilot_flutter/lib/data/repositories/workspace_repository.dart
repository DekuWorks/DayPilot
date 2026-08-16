import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/workspace_colors.dart';
import '../../domain/models/workspace_record.dart';

class WorkspaceRepository {
  WorkspaceRepository(this._client);

  final SupabaseClient _client;

  Future<List<WorkspaceRecord>> listAndEnsure() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];

    var rows = await _listOwned(uid);
    for (final seed in kDefaultWorkspaceSeeds) {
      final exists = rows.any(
        (r) =>
            r.type == seed.type ||
            r.name.toLowerCase() == seed.name.toLowerCase(),
      );
      if (exists) continue;
      final keys = rows.map((r) => r.colorKey);
      final color = isWorkspaceColorTaken(seed.color, keys)
          ? firstFreeWorkspaceColor(keys)
          : seed.color;
      try {
        final created = await _client
            .from('workspaces')
            .insert({
              'owner_id': uid,
              'name': seed.name,
              'color': color,
              'type': seed.type,
            })
            .select('id, name, color, type')
            .single();
        final mapped = WorkspaceRecord.fromSupabaseRow(created);
        rows = [...rows, mapped];
        try {
          await _client.from('workspace_members').insert({
            'workspace_id': mapped.id,
            'user_id': uid,
            'role': 'owner',
            'status': 'active',
          });
        } catch (_) {}
      } catch (_) {}
    }
    return rows;
  }

  Future<List<WorkspaceRecord>> _listOwned(String userId) async {
    final rows = await _client
        .from('workspaces')
        .select('id, name, color, type')
        .eq('owner_id', userId)
        .order('created_at', ascending: true);
    return (rows as List<dynamic>)
        .map(
          (e) => WorkspaceRecord.fromSupabaseRow(
            Map<String, dynamic>.from(e as Map),
          ),
        )
        .toList();
  }

  Future<WorkspaceRecord> updateColor({
    required String workspaceId,
    required String color,
    required List<WorkspaceRecord> workspaces,
  }) async {
    final hex = normalizeColorHex(color);
    if (hex == null) {
      throw Exception('Invalid colour');
    }
    if (isWorkspaceColorTaken(
      hex,
      workspaces.map((w) => w.colorKey),
      exceptId: workspaceId,
    )) {
      throw Exception('That colour is already used by another workspace');
    }
    final row = await _client
        .from('workspaces')
        .update({
          'color': hex,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', workspaceId)
        .select('id, name, color, type')
        .single();
    return WorkspaceRecord.fromSupabaseRow(row);
  }
}
