import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class AppShellDestination {
  const AppShellDestination({
    required this.icon,
    required this.selected,
    required this.label,
  });

  final IconData icon;
  final IconData selected;
  final String label;
}

/// Bottom-nav: Home · Tasks · Insights · Profile.
const kAppShellDestinations = [
  AppShellDestination(
    icon: Icons.home_outlined,
    selected: Icons.home_rounded,
    label: 'Home',
  ),
  AppShellDestination(
    icon: Icons.check_circle_outline_rounded,
    selected: Icons.check_circle_rounded,
    label: 'Tasks',
  ),
  AppShellDestination(
    icon: Icons.bar_chart_outlined,
    selected: Icons.bar_chart_rounded,
    label: 'Insights',
  ),
  AppShellDestination(
    icon: Icons.person_outline_rounded,
    selected: Icons.person_rounded,
    label: 'Profile',
  ),
];

const kCapsuleBarHeight = 56.0;
const kCapsuleBottomGap = 8.0;
const kCapsuleHorizontalInset = 20.0;

/// Space reserved so content clears the floating capsule + home indicator.
double capsuleNavReserve(BuildContext context) {
  return kCapsuleBarHeight +
      kCapsuleBottomGap +
      MediaQuery.paddingOf(context).bottom;
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final media = MediaQuery.of(context);
    final reserve = capsuleNavReserve(context);
    return Scaffold(
      backgroundColor: colors.backgroundPrimary,
      extendBody: true,
      body: Stack(
        children: [
          MediaQuery(
            data: media.copyWith(
              padding: media.padding.copyWith(bottom: reserve),
            ),
            child: navigationShell,
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: CapsuleTabBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Instagram-style floating pill. Theme tokens only — no drop-shadow.
class CapsuleTabBar extends StatelessWidget {
  const CapsuleTabBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        kCapsuleHorizontalInset,
        0,
        kCapsuleHorizontalInset,
        bottom > 0 ? bottom : kCapsuleBottomGap,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.surfacePrimary.withValues(alpha: 0.88),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: colors.borderStrong),
            ),
            child: SizedBox(
              height: kCapsuleBarHeight,
              child: Row(
                children: [
                  for (var i = 0; i < kAppShellDestinations.length; i++)
                    Expanded(
                      child: _CapsuleTab(
                        destination: kAppShellDestinations[i],
                        selected: i == selectedIndex,
                        onTap: () => onDestinationSelected(i),
                      ),
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

class _CapsuleTab extends StatelessWidget {
  const _CapsuleTab({
    required this.destination,
    required this.selected,
    required this.onTap,
  });

  final AppShellDestination destination;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.dp;
    final color = selected ? colors.accent : colors.textTertiary;
    return InkWell(
      onTap: onTap,
      splashColor: colors.accent.withValues(alpha: 0.12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            selected ? destination.selected : destination.icon,
            size: 22,
            color: color,
          ),
          const SizedBox(height: 2),
          Text(
            destination.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
