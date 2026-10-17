import 'package:daypilot_flutter/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('brand accents use the sage already on DayPilotScheme', () {
    expect(DayPilotColors.brand400, const Color(0xFF2E8B57));
    expect(DayPilotColors.brand500, const Color(0xFF3D9B6A));
    expect(DayPilotColors.brand600, const Color(0xFF1B7A4A));

    expect(DayPilotScheme.dark.accent, DayPilotColors.brand500);
    expect(DayPilotScheme.light.accent, DayPilotColors.brand600);
    expect(DayPilotColors.brandGradient.colors, <Color>[
      DayPilotColors.brand500,
      DayPilotColors.brand600,
    ]);

    expect(DayPilotColors.brand400, isNot(const Color(0xFF6CFF4A)));
    expect(DayPilotColors.brand500, isNot(const Color(0xFF39FF14)));
    expect(DayPilotColors.brand600, isNot(const Color(0xFF16B947)));
  });
}
