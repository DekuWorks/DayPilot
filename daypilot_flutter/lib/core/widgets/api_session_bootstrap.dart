import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/repository_providers.dart';

/// On launch, exchanges Supabase session for Nest JWT when Option C is enabled.
class ApiSessionBootstrap extends ConsumerStatefulWidget {
  const ApiSessionBootstrap({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ApiSessionBootstrap> createState() =>
      _ApiSessionBootstrapState();
}

class _ApiSessionBootstrapState extends ConsumerState<ApiSessionBootstrap> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await ref.read(authRepositoryProvider).syncApiSession();
      } catch (_) {
        // ignore
      }
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
