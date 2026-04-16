import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/repository_providers.dart';

/// Themed error UI for calendar tabs — raw [StateError] text looked unstyled and had no recovery.
class CalendarErrorView extends ConsumerWidget {
  const CalendarErrorView({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object error;
  final VoidCallback onRetry;

  static bool _isRecoverableSessionOrExchangeError(Object e) {
    if (e is StateError && e.message.contains('No Nest API session')) {
      return true;
    }
    final s = e.toString();
    return s.contains('No Nest API session') ||
        s.contains('Session expired') ||
        s.contains('API exchange failed') ||
        s.contains('Invalid exchange response') ||
        s.contains('Invalid refresh response');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final nest = _isRecoverableSessionOrExchangeError(error);

    Future<void> signOut() async {
      await ref.read(authRepositoryProvider).signOut();
      if (context.mounted) context.go('/login');
    }

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            elevation: 0,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    nest ? Icons.link_off_rounded : Icons.error_outline_rounded,
                    size: 40,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    nest ? 'DayPilot API not connected' : 'Could not load calendar',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    nest
                        ? 'The DayPilot server didn’t accept your session or the link is missing. '
                            'Check that the API is running and your keys match, then retry. You can also sign out.'
                        : '$error',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.tonal(
                        onPressed: onRetry,
                        child: const Text('Retry'),
                      ),
                      FilledButton(
                        onPressed: signOut,
                        child: const Text('Sign out'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
