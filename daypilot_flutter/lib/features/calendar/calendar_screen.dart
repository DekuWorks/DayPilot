import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Legacy `/calendar` tab — router now redirects to Home.
class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) context.go('/home');
    });
    return const SizedBox.shrink();
  }
}
