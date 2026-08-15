import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Green circle with a photo or fallback initial.
class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.initials,
    this.imageUrl,
    this.radius = 28,
    this.onTap,
  });

  final String initials;
  final String? imageUrl;
  final double radius;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final hasPhoto = imageUrl != null && imageUrl!.isNotEmpty;
    final accent = context.dp.accent;
    final avatar = CircleAvatar(
      radius: radius,
      backgroundColor: accent.withValues(alpha: 0.2),
      backgroundImage: hasPhoto ? NetworkImage(imageUrl!) : null,
      onBackgroundImageError: hasPhoto ? (_, _) {} : null,
      child: hasPhoto
          ? null
          : Text(
              initials,
              style: TextStyle(
                color: accent,
                fontWeight: FontWeight.w800,
                fontSize: radius * 0.75,
              ),
            ),
    );

    if (onTap == null) return avatar;

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: context.dp.surfacePrimary,
                shape: BoxShape.circle,
                border: Border.all(color: context.dp.borderSubtle),
              ),
              child: Icon(
                Icons.camera_alt_rounded,
                size: radius * 0.45,
                color: accent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
