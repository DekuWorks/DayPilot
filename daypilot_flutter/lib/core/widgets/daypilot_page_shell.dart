import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Shared cream gradient + app chrome for subpages (matches [DashboardScreen]).
class DayPilotPageShell extends StatelessWidget {
  const DayPilotPageShell({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.bottom,
    this.fallbackRoute = '/dashboard',
  });

  final Widget title;
  final Widget body;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final String fallbackRoute;

  /// When the route stack is empty, navigates to [fallbackRoute] (default dashboard).
  static void popOrFallback(BuildContext context, {String fallbackRoute = '/dashboard'}) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(fallbackRoute);
    }
  }

  @override
  Widget build(BuildContext context) {
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
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => popOrFallback(context, fallbackRoute: fallbackRoute),
          ),
          title: title,
          actions: actions,
          bottom: bottom,
        ),
        body: body,
      ),
    );
  }
}
