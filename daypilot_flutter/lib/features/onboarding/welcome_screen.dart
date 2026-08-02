import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/gradient_brand_title.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            DayPilotColors.backgroundPrimary,
            DayPilotColors.surfacePrimary,
            DayPilotColors.backgroundPrimary,
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 46,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: GradientBrandTitle(fontSize: 28),
                      ),
                      const SizedBox(height: 54),
                      Text(
                        'Plan. Pilot. Perform.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: DayPilotColors.brand500,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text.rich(
                        TextSpan(
                          text: 'Plan smarter. ',
                          children: [
                            TextSpan(
                              text: 'Perform better.',
                              style: TextStyle(
                                foreground: Paint()
                                  ..shader = DayPilotColors.brandGradient
                                      .createShader(
                                    const Rect.fromLTWH(0, 0, 320, 70),
                                  ),
                              ),
                            ),
                          ],
                        ),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          color: DayPilotColors.textPrimary,
                          fontSize: 42,
                          fontWeight: FontWeight.w800,
                          height: 1.05,
                          letterSpacing: -1.4,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'Bring your calendar, tasks, meetings, and daily planning into one intelligent iOS workspace.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: DayPilotColors.textSecondary,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 34),
                      const _DashboardPreviewCard(),
                      const SizedBox(height: 28),
                      const _FeatureStrip(),
                      const SizedBox(height: 30),
                      FilledButton(
                        onPressed: () => context.go('/signup'),
                        child: const Text('Get Started Free'),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () => context.go('/login'),
                        child: const Text('Sign In'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _DashboardPreviewCard extends StatelessWidget {
  const _DashboardPreviewCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: DayPilotColors.surfacePrimary.withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: DayPilotColors.borderSubtle),
        boxShadow: [
          BoxShadow(
            color: DayPilotColors.brand500.withValues(alpha: 0.12),
            blurRadius: 48,
            offset: const Offset(0, 24),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 42,
                width: 42,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: DayPilotColors.brandGradient,
                ),
                child: const Icon(
                  Icons.flight_takeoff_rounded,
                  color: DayPilotColors.textInverse,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Today',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Your day at a glance',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: DayPilotColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.more_horiz_rounded,
                color: DayPilotColors.textSecondary,
              ),
            ],
          ),
          const SizedBox(height: 18),
          const _PreviewMetric(
            icon: Icons.calendar_month_rounded,
            label: 'Meetings',
            value: '4',
          ),
          const SizedBox(height: 10),
          const _PreviewMetric(
            icon: Icons.bolt_rounded,
            label: 'Focus time',
            value: '2h 15m',
          ),
          const SizedBox(height: 10),
          const _PreviewMetric(
            icon: Icons.check_circle_outline_rounded,
            label: 'Tasks planned',
            value: '7',
          ),
        ],
      ),
    );
  }
}

class _PreviewMetric extends StatelessWidget {
  const _PreviewMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: DayPilotColors.surfaceSecondary,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: DayPilotColors.borderSubtle),
      ),
      child: Row(
        children: [
          Icon(icon, color: DayPilotColors.brand500, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: DayPilotColors.textSecondary,
                  ),
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: DayPilotColors.textPrimary,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _FeatureStrip extends StatelessWidget {
  const _FeatureStrip();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(
          child: _FeaturePill(
            icon: Icons.event_available_rounded,
            label: 'Calendar',
          ),
        ),
        SizedBox(width: 10),
        Expanded(
          child: _FeaturePill(
            icon: Icons.task_alt_rounded,
            label: 'Tasks',
          ),
        ),
        SizedBox(width: 10),
        Expanded(
          child: _FeaturePill(
            icon: Icons.auto_awesome_rounded,
            label: 'Pilot Brief',
          ),
        ),
      ],
    );
  }
}

class _FeaturePill extends StatelessWidget {
  const _FeaturePill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: DayPilotColors.brand500.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: DayPilotColors.brand500.withValues(alpha: 0.28),
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: DayPilotColors.brand500, size: 20),
          const SizedBox(height: 6),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: DayPilotColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}
