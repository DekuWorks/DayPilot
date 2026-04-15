import 'package:flutter/material.dart';

/// Shared loading / empty / error surfaces (task 26).
class AsyncBody extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.isLoading,
    this.error,
    this.isEmpty = false,
    required this.child,
    this.emptyMessage = 'Nothing here yet.',
  });

  final bool isLoading;
  final Object? error;
  final bool isEmpty;
  final Widget child;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            error.toString(),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (isEmpty) {
      return Center(child: Text(emptyMessage));
    }
    return child;
  }
}
