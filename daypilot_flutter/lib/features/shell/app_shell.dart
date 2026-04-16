import 'package:flutter/material.dart';

/// Thin wrapper for authenticated routes — calendar lives in [DashboardScreen].
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => child;
}
