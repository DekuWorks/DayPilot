import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/notification_preference_provider.dart';
import '../../core/theme/app_theme.dart';

/// Settings / Notifications switch: opt in, request OS permission, persist.
class DayPilotNotificationsToggle extends ConsumerStatefulWidget {
  const DayPilotNotificationsToggle({
    super.key,
    this.contentPadding,
  });

  final EdgeInsetsGeometry? contentPadding;

  @override
  ConsumerState<DayPilotNotificationsToggle> createState() =>
      _DayPilotNotificationsToggleState();
}

class _DayPilotNotificationsToggleState
    extends ConsumerState<DayPilotNotificationsToggle> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(notificationPreferenceProvider.notifier).reconcileWithSystem();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pref = ref.watch(notificationPreferenceProvider);
    final colors = context.dp;
    final hint = defaultTargetPlatform == TargetPlatform.iOS
        ? 'Enable in iOS Settings'
        : 'Enable in system Settings';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          contentPadding: widget.contentPadding ?? EdgeInsets.zero,
          title: const Text('DayPilot notifications'),
          subtitle: Text(pref.enabled ? 'On' : 'Off'),
          value: pref.enabled,
          activeThumbColor: colors.accent,
          onChanged: pref.busy
              ? null
              : (v) => ref
                  .read(notificationPreferenceProvider.notifier)
                  .setEnabled(v),
        ),
        if (pref.showSettingsHint)
          Padding(
            padding: const EdgeInsets.only(left: 4, right: 4, bottom: 8),
            child: Text(
              hint,
              style: TextStyle(
                color: DayPilotColors.warning,
                fontSize: 13,
              ),
            ),
          ),
      ],
    );
  }
}
