import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../providers/api_session_sync_provider.dart';
import '../providers/bootstrap_providers.dart';

/// On launch and after Supabase auth changes, exchanges for Nest JWT when Option C is enabled.
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(apiSessionSyncProvider.notifier).sync();
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AuthState>>(authStateChangeProvider, (prev, next) {
      next.whenData((authState) {
        if (!mounted) return;
        if (authState.session == null) {
          ref.read(apiSessionSyncProvider.notifier).resetForSignedOut();
        } else {
          ref.read(apiSessionSyncProvider.notifier).sync();
        }
      });
    });
    return widget.child;
  }
}
