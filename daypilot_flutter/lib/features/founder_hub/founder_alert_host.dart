import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/bootstrap_providers.dart';
import '../../core/providers/notification_preference_provider.dart';
import '../../core/services/local_notifications_service.dart';
import 'founder_hub_api.dart';

/// In-app alert for the hub owner. A local notification is shown when the
/// phone already allows alerts. Remote APNs is separate and is not claimed here.
class FounderAlertHost extends ConsumerStatefulWidget {
  const FounderAlertHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<FounderAlertHost> createState() => _FounderAlertHostState();
}

class _FounderAlertHostState extends ConsumerState<FounderAlertHost> {
  Timer? _timer;
  final _seen = <String>{};
  bool _registered = false;

  @override
  void initState() {
    super.initState();
    onFounderLocalNotificationTap = (payload) {
      if (!mounted || payload == null || payload.isEmpty) return;
      context.push('/settings/founder-inbox/$payload');
    };
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _poll());
    WidgetsBinding.instance.addPostFrameCallback((_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    if (onFounderLocalNotificationTap != null) {
      onFounderLocalNotificationTap = null;
    }
    super.dispose();
  }

  Future<void> _poll() async {
    final session = ref.read(nestApiSessionProvider);
    if (!session.hasSession) return;
    final api = FounderHubApi(session);
    try {
      final account = await api.account();
      final hub = account['founderHub'];
      if (hub is! Map || hub['isOwner'] != true) return;
      if (!_registered) {
        _registered = true;
        final push = ref.read(pushNotificationServiceProvider);
        final token = await push?.currentToken();
        if (token != null && token.length >= 8) {
          await api.registerDevice(token);
        }
      }
      final alerts = await api.alerts();
      final rows = alerts['alerts'];
      if (rows is! List || !mounted) return;
      for (final row in rows.whereType<Map>()) {
        final id = '${row['noticeId']}';
        if (id.isEmpty || _seen.contains(id)) continue;
        _seen.add(id);
        final title = '${row['title'] ?? 'Founder message'}';
        final body = '${row['body'] ?? ''}';
        final suggestionId = row['suggestionId'] as String?;
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(body.isEmpty ? title : body),
            action: suggestionId == null
                ? null
                : SnackBarAction(
                    label: 'Open',
                    onPressed: () =>
                        context.push('/settings/founder-inbox/$suggestionId'),
                  ),
          ),
        );
        final enabled = ref.read(notificationPreferenceProvider).enabled;
        if (enabled) {
          await ref.read(localNotificationsServiceProvider).showNow(
                id: id.hashCode & 0x7fffffff,
                title: title,
                body: body,
                payload: suggestionId,
              );
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
