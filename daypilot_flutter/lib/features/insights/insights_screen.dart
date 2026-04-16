import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import 'insights_providers.dart';

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(latestInsightProvider);
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            DayPilotColors.cream,
            DayPilotColors.creamLight,
            DayPilotColors.cream,
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Insights'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.canPop() ? context.pop() : context.go('/dashboard'),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
          snap.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('Could not load insights: $e'),
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
