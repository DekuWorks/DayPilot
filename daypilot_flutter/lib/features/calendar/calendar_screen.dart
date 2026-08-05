import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import 'calendar_panel.dart';

/// Calendar tab — Month / Week / Day views.
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Calendar',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: DayPilotColors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'New event',
                    onPressed: () => context.push('/events/new'),
                    icon: const Icon(Icons.add_circle_rounded),
                    color: DayPilotColors.brand500,
                  ),
                ],
              ),
            ),
            const Expanded(child: CalendarPanel()),
          ],
        ),
      ),
    );
  }
}
