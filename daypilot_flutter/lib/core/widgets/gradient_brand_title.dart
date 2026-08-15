import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';

/// Brand mark + DayPilot wordmark for auth and marketing surfaces.
class BrandLockup extends StatelessWidget {
  const BrandLockup({
    super.key,
    this.markSize = 72,
    this.fontSize = 28,
    this.showWordmark = true,
  });

  final double markSize;
  final double fontSize;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/branding/logo_mark.png',
          width: markSize,
          height: markSize,
          filterQuality: FilterQuality.high,
        ),
        if (showWordmark) ...[
          const SizedBox(height: 12),
          ShaderMask(
            blendMode: BlendMode.srcIn,
            shaderCallback: (bounds) =>
                DayPilotColors.brandGradient.createShader(
              Rect.fromLTWH(0, 0, bounds.width, bounds.height),
            ),
            child: Text(
              'DayPilot',
              style: GoogleFonts.inter(
                fontSize: fontSize,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Web marketing “DayPilot” wordmark (kept for screens that only need text).
class GradientBrandTitle extends StatelessWidget {
  const GradientBrandTitle({super.key, this.fontSize = 26});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) =>
          DayPilotColors.brandGradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      child: Text(
        'DayPilot',
        style: GoogleFonts.inter(
          fontSize: fontSize,
          fontWeight: FontWeight.w800,
          color: Colors.white,
        ),
      ),
    );
  }
}
