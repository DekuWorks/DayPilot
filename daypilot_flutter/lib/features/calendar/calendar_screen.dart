import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import 'calendar_panel.dart';
import 'calendar_view_mode.dart';

/// Calendar tab: Month / Week / Day. Today lives on the first tab.
class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final view = parseCalendarViewMode(
      GoRouterState.of(context).uri.queryParameters['view'],
    );
    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      body: SafeArea(
        bottom: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Calendar',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'New event',
                    onPressed: () => context.push('/events/new'),
                    icon: Icon(Icons.add_circle_rounded, color: colors.accent),
                  ),
                ],
              ),
            ),
            Expanded(child: CalendarPanel(initialView: view)),
          ],
        ),
      ),
    );
  }
}
