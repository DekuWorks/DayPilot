import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import 'insights_providers.dart';

class DailyBriefScreen extends ConsumerWidget {
  const DailyBriefScreen({super.key});

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
          title: const Text('Daily brief'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.canPop() ? context.pop() : context.go('/insights'),
          ),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: snap.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e'),
            data: (insight) {
              if (insight == null) {
                return const Text('Sign in to load your brief.');
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    insight.headline ?? 'Brief',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'You have '
                    '${insight.metrics['upcoming_event_count'] ?? 0} '
                    'events in the next week (from Supabase).',
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
