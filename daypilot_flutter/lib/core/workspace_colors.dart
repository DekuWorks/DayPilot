/// Shared workspace/calendar colour palette — same hexes as web workspace-colors.ts
class WorkspaceColorOption {
  const WorkspaceColorOption({
    required this.id,
    required this.name,
    required this.hex,
  });

  final String id;
  final String name;
  final String hex;
}

const kWorkspaceColorPalette = <WorkspaceColorOption>[
  WorkspaceColorOption(id: 'orange', name: 'Orange', hex: '#F97316'),
  WorkspaceColorOption(id: 'blue', name: 'Blue', hex: '#3B82F6'),
  WorkspaceColorOption(id: 'purple', name: 'Purple', hex: '#7C3AED'),
  WorkspaceColorOption(id: 'lavender', name: 'Lavender', hex: '#C084FC'),
  WorkspaceColorOption(id: 'green', name: 'Green', hex: '#3D9B6A'),
  WorkspaceColorOption(id: 'teal', name: 'Teal', hex: '#14B8A6'),
  WorkspaceColorOption(id: 'pink', name: 'Pink', hex: '#EC4899'),
  WorkspaceColorOption(id: 'amber', name: 'Amber', hex: '#F59E0B'),
  WorkspaceColorOption(id: 'red', name: 'Red', hex: '#EF4444'),
  WorkspaceColorOption(id: 'sky', name: 'Sky', hex: '#38BDF8'),
];

const kDefaultWorkspaceSeeds = <({String name, String type, String color})>[
  (name: 'Personal', type: 'personal', color: '#F97316'),
  (name: 'Work', type: 'work', color: '#3B82F6'),
  (name: 'Side Projects', type: 'side', color: '#7C3AED'),
  (name: 'School', type: 'school', color: '#C084FC'),
];

String? normalizeColorHex(String? raw) {
  if (raw == null) return null;
  var hex = raw.trim();
  if (hex.isEmpty) return null;
  if (hex.startsWith('#')) hex = hex.substring(1);
  if (hex.length == 3) {
    hex = hex.split('').map((c) => '$c$c').join();
  }
  if (hex.length == 8) hex = hex.substring(2);
  if (hex.length != 6) return null;
  if (int.tryParse(hex, radix: 16) == null) return null;
  return '#${hex.toUpperCase()}';
}

Set<String> usedWorkspaceColors(
  Iterable<({String id, String color})> workspaces, {
  String? exceptId,
}) {
  final used = <String>{};
  for (final ws in workspaces) {
    if (exceptId != null && ws.id == exceptId) continue;
    final hex = normalizeColorHex(ws.color);
    if (hex != null) used.add(hex);
  }
  return used;
}

bool isWorkspaceColorTaken(
  String hex,
  Iterable<({String id, String color})> workspaces, {
  String? exceptId,
}) {
  final normalized = normalizeColorHex(hex);
  if (normalized == null) return false;
  return usedWorkspaceColors(workspaces, exceptId: exceptId).contains(normalized);
}

String firstFreeWorkspaceColor(
  Iterable<({String id, String color})> workspaces, {
  String? exceptId,
}) {
  final used = usedWorkspaceColors(workspaces, exceptId: exceptId);
  for (final option in kWorkspaceColorPalette) {
    if (!used.contains(option.hex)) return option.hex;
  }
  return kWorkspaceColorPalette.first.hex;
}

WorkspaceColorOption? paletteOptionForHex(String? hex) {
  final normalized = normalizeColorHex(hex);
  if (normalized == null) return null;
  for (final option in kWorkspaceColorPalette) {
    if (option.hex == normalized) return option;
  }
  return null;
}
