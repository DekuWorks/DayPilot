import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Next step when a calendar range has no events.
///
/// Connecting a calendar is optional. Callers pass the actions so this widget
/// does not change routing or sync.
class EmptyScheduleHint extends StatelessWidget {
  const EmptyScheduleHint({
    super.key,
    required this.title,
    required this.body,
    required this.primaryLabel,
    required this.onPrimary,
    required this.secondaryLabel,
    required this.onSecondary,
    this.dismissLabel,
    this.onDismiss,
    this.tertiaryLabel,
    this.onTertiary,
    this.compact = false,
  });

  final String title;
  final String body;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String secondaryLabel;
  final VoidCallback onSecondary;
  final String? dismissLabel;
  final VoidCallback? onDismiss;
  final String? tertiaryLabel;
  final VoidCallback? onTertiary;

  /// Compact strip for the home column. The full layout replaces an empty list.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final theme = Theme.of(context);
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment:
          compact ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        if (!compact)
          Icon(
            Icons.event_available_outlined,
            size: 36,
            color: colors.accent,
          ),
        if (!compact) const SizedBox(height: 12),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: compact ? 14 : null,
          ),
          textAlign: compact ? TextAlign.start : TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colors.textSecondary,
            height: 1.35,
            fontSize: compact ? 13 : null,
          ),
          textAlign: compact ? TextAlign.start : TextAlign.center,
        ),
        const SizedBox(height: 12),
        Wrap(
          alignment: compact ? WrapAlignment.start : WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: onPrimary,
              child: Text(primaryLabel),
            ),
            OutlinedButton(
              onPressed: onSecondary,
              child: Text(secondaryLabel),
            ),
            if (tertiaryLabel != null && onTertiary != null)
              OutlinedButton(
                onPressed: onTertiary,
                child: Text(tertiaryLabel!),
              ),
            if (dismissLabel != null && onDismiss != null)
              TextButton(
                onPressed: onDismiss,
                child: Text(dismissLabel!),
              ),
          ],
        ),
      ],
    );

    if (compact) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        child: content,
      );
    }

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: content,
        ),
      ),
    );
  }
}
