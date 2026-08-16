import '../../core/workspace_colors.dart';

class WorkspaceRecord {
  const WorkspaceRecord({
    required this.id,
    required this.name,
    required this.color,
    this.type = 'other',
  });

  final String id;
  final String name;
  final String color;
  final String type;

  ({String id, String color}) get colorKey => (id: id, color: color);

  WorkspaceRecord copyWith({String? color}) {
    return WorkspaceRecord(
      id: id,
      name: name,
      color: color ?? this.color,
      type: type,
    );
  }

  static WorkspaceRecord fromSupabaseRow(Map<String, dynamic> row) {
    return WorkspaceRecord(
      id: row['id'].toString(),
      name: row['name'] as String? ?? 'Workspace',
      color: normalizeColorHex(row['color'] as String?) ?? '#3D9B6A',
      type: row['type'] as String? ?? 'other',
    );
  }
}
