import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/daypilot_page_shell.dart';
import 'insight_load_error.dart';
import 'insights_providers.dart';

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(latestInsightProvider);
    return DayPilotPageShell(
      title: const Text('Insights'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            snap.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => InsightLoadError(
                error: e,
                title: 'Could not load insights',
              ),
              data: (insight) {
                if (insight == null) {
                  return const Text('Sign in to see insights.');
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      insight.headline ?? 'Insights',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Upcoming events (7 days): '
                      '${insight.metrics['upcoming_event_count'] ?? 0}',
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            FilledButton.tonal(
              onPressed: () => context.push('/insights/brief'),
              child: const Text('Open daily brief'),
            ),
          ],
        ),
      ),
    );
  }
}
