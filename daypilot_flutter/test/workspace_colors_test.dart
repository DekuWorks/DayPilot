import 'package:daypilot_flutter/core/workspace_colors.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('used colours are taken except the current workspace', () {
    final workspaces = [
      (id: 'personal', color: '#F97316'),
      (id: 'work', color: '#3B82F6'),
    ];
    expect(isWorkspaceColorTaken('#F97316', workspaces), isTrue);
    expect(
      isWorkspaceColorTaken('#F97316', workspaces, exceptId: 'personal'),
      isFalse,
    );
    expect(isWorkspaceColorTaken('#14B8A6', workspaces), isFalse);
  });

  test('first free colour skips taken swatches', () {
    final workspaces = [
      (id: 'a', color: '#F97316'),
      (id: 'b', color: '#3B82F6'),
    ];
    expect(firstFreeWorkspaceColor(workspaces), '#7C3AED');
  });

  test('hex normalisation is case-insensitive', () {
    expect(normalizeColorHex('#f97316'), '#F97316');
    expect(
      isWorkspaceColorTaken('#f97316', [(id: 'a', color: '#F97316')]),
      isTrue,
    );
  });
}
