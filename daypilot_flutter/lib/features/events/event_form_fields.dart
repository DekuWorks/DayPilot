import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/workspace_colors.dart';
import '../../domain/models/workspace_record.dart';

class EventLabeledField extends StatelessWidget {
  const EventLabeledField({
    super.key,
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = DayPilotScheme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: colors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

InputDecoration eventFieldDecoration(BuildContext context, {String? hint}) {
  final colors = DayPilotScheme.of(context);
  return InputDecoration(
    hintText: hint,
    filled: true,
    fillColor: colors.surfaceSecondary,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: colors.borderSubtle),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: colors.borderSubtle),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: colors.accent, width: 2),
    ),
  );
}

class WorkspaceColorFields extends StatelessWidget {
  const WorkspaceColorFields({
    super.key,
    required this.workspaces,
    required this.workspaceId,
    required this.colorHex,
    required this.onWorkspaceChanged,
    required this.onColorChanged,
    this.loading = false,
  });

  final List<WorkspaceRecord> workspaces;
  final String? workspaceId;
  final String colorHex;
  final ValueChanged<String> onWorkspaceChanged;
  final ValueChanged<String> onColorChanged;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = DayPilotScheme.of(context);
    final selectedId = workspaces.any((w) => w.id == workspaceId)
        ? workspaceId
        : (workspaces.isEmpty ? null : workspaces.first.id);
    final used = usedWorkspaceColors(
      workspaces.map((w) => w.colorKey),
      exceptId: selectedId,
    );
    final selectedHex = () {
      final normalized = normalizeColorHex(colorHex);
      if (normalized != null &&
          kWorkspaceColorPalette.any((o) => o.hex == normalized)) {
        return normalized;
      }
      return kWorkspaceColorPalette.first.hex;
    }();

    return Column(
      children: [
        EventLabeledField(
          label: 'Workspace',
          child: workspaces.isEmpty
              ? InputDecorator(
                  decoration: eventFieldDecoration(context),
                  child: Text(
                    loading ? 'Loading workspaces…' : 'No workspaces yet',
                    style: TextStyle(color: colors.textTertiary),
                  ),
                )
              : DropdownButtonFormField<String>(
                  key: ValueKey('workspace-$selectedId'),
                  initialValue: selectedId,
                  decoration: eventFieldDecoration(context),
                  items: [
                    for (final ws in workspaces)
                      DropdownMenuItem(
                        value: ws.id,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _Swatch(hex: ws.color),
                            const SizedBox(width: 10),
                            Text(ws.name),
                          ],
                        ),
                      ),
                  ],
                  onChanged: (v) {
                    if (v != null) onWorkspaceChanged(v);
                  },
                ),
        ),
        EventLabeledField(
          label: 'Colour tag',
          child: DropdownButtonFormField<String>(
            key: ValueKey('colour-$selectedHex'),
            initialValue: selectedHex,
            decoration: eventFieldDecoration(context),
            selectedItemBuilder: (context) {
              return [
                for (final option in kWorkspaceColorPalette)
                  Row(
                    children: [
                      _Swatch(hex: option.hex, dimmed: used.contains(option.hex)),
                      const SizedBox(width: 10),
                      Text(option.name),
                    ],
                  ),
              ];
            },
            items: [
              for (final option in kWorkspaceColorPalette)
                DropdownMenuItem(
                  value: option.hex,
                  enabled: !used.contains(option.hex),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _Swatch(
                        hex: option.hex,
                        dimmed: used.contains(option.hex),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        used.contains(option.hex)
                            ? '${option.name} · used'
                            : option.name,
                        style: TextStyle(
                          color: used.contains(option.hex)
                              ? colors.textTertiary
                              : colors.textPrimary,
                        ),
                      ),
                      if (used.contains(option.hex)) ...[
                        const SizedBox(width: 8),
                        Icon(
                          Icons.lock_outline,
                          size: 16,
                          color: colors.textTertiary,
                        ),
                      ],
                    ],
                  ),
                ),
            ],
            onChanged: (v) {
              if (v == null || used.contains(v)) return;
              onColorChanged(v);
            },
          ),
        ),
      ],
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({required this.hex, this.dimmed = false});

  final String hex;
  final bool dimmed;

  @override
  Widget build(BuildContext context) {
    final parsed = parseHexColor(hex);
    return Opacity(
      opacity: dimmed ? 0.4 : 1,
      child: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: parsed ?? DayPilotScheme.of(context).accent,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

Color? parseHexColor(String? raw) {
  final hex = normalizeColorHex(raw);
  if (hex == null) return null;
  return Color(int.parse('FF${hex.substring(1)}', radix: 16));
}
