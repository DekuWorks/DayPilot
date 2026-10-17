import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Rounded surface card used by the redesigned screens.
class DpCard extends StatelessWidget {
  const DpCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.selected = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  /// Draws the sage border used for a chosen option.
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: selected
            ? colors.accent.withValues(alpha: 0.10)
            : colors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: selected ? colors.accent : colors.borderSubtle,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: box,
      ),
    );
  }
}

/// Small rounded square holding an icon, tinted.
class DpIconTile extends StatelessWidget {
  const DpIconTile({super.key, required this.icon, required this.tint});

  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(11),
      ),
      child: Icon(icon, size: 20, color: tint),
    );
  }
}

/// Section heading with an optional trailing action.
class DpSectionTitle extends StatelessWidget {
  const DpSectionTitle({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    return Row(
      children: [
        Expanded(
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: colors.textPrimary,
              ),
            ),
          ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    );
  }
}

/// Compact status label such as Active, Paused or High.
class DpPill extends StatelessWidget {
  const DpPill({super.key, required this.label, required this.tint});

  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: tint,
        ),
      ),
    );
  }
}
