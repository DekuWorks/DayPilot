import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Bottom-nav shell matching the DayPilot mobile mock: Home · Calendar · Tasks · Insights · Profile.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    (icon: Icons.home_outlined, selected: Icons.home_rounded, label: 'Home'),
    (
      icon: Icons.calendar_today_outlined,
      selected: Icons.calendar_today_rounded,
      label: 'Calendar'
    ),
    (
      icon: Icons.check_circle_outline_rounded,
      selected: Icons.check_circle_rounded,
      label: 'Tasks'
    ),
    (
      icon: Icons.insights_outlined,
      selected: Icons.insights_rounded,
      label: 'Insights'
    ),
    (
      icon: Icons.person_outline_rounded,
      selected: Icons.person_rounded,
      label: 'Profile'
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DayPilotColors.backgroundPrimary,
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: [
          for (final d in _destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selected),
              label: d.label,
            ),
        ],
      ),
    );
  }
}
