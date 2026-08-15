import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/calendar_connection_providers.dart';
import '../../core/providers/calendar_refresh_provider.dart';
import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import '../../data/services/apple_calendar_service.dart';
import '../../domain/calendar/calendar_provider.dart';

enum _FlowStep { explain, permission, select, syncing, done }

/// Guided Apple Calendar (EventKit) connection — separate from Apple SSO.
class AppleCalendarFlowScreen extends ConsumerStatefulWidget {
  const AppleCalendarFlowScreen({super.key});

  @override
  ConsumerState<AppleCalendarFlowScreen> createState() =>
      _AppleCalendarFlowScreenState();
}

class _AppleCalendarFlowScreenState
    extends ConsumerState<AppleCalendarFlowScreen> {
  final _service = AppleCalendarService();
  _FlowStep _step = _FlowStep.explain;
  String? _error;
  List<DiscoveredDeviceCalendar> _calendars = [];
  double _progress = 0;
  String _progressLabel = '';
  bool _busy = false;

  Future<void> _continueFromExplain() async {
    setState(() {
      _error = null;
      _step = _FlowStep.permission;
    });
    await _requestPermissionAndDiscover();
  }

  Future<void> _requestPermissionAndDiscover() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final status = await _service.requestCalendarPermission();
      if (status == CalendarPermissionState.denied ||
          status == CalendarPermissionState.restricted) {
        setState(() {
          _error = status == CalendarPermissionState.restricted
              ? 'Calendar access is restricted on this device.'
              : 'Calendar access was denied.';
          _busy = false;
        });
        return;
      }
      if (status != CalendarPermissionState.granted) {
        setState(() {
          _error = 'Calendar permission is required to continue.';
          _busy = false;
        });
        return;
      }

      final connections =
          await ref.read(calendarConnectionsRepositoryProvider).listConnections();
      final hasGoogle = connections.any((c) => c.provider == 'google');
      final hasOutlook = connections.any((c) => c.provider == 'outlook');
      final calendars = await _service.getAvailableDeviceCalendars(
        hasGoogleConnection: hasGoogle,
        hasMicrosoftConnection: hasOutlook,
      );
      if (!mounted) return;
      setState(() {
        _calendars = calendars;
        _step = _FlowStep.select;
        _busy = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _busy = false;
        });
      }
    }
  }

  void _selectAll(bool value) {
    setState(() {
      for (final c in _calendars) {
        if (!c.duplicatePrevented) c.isSelected = value;
      }
    });
  }

  Future<void> _runSync() async {
    final selected = _calendars.where((c) => c.isSelected).toList();
    if (selected.isEmpty) {
      setState(() => _error = 'Select at least one calendar to continue.');
      return;
    }
    setState(() {
      _error = null;
      _busy = true;
      _step = _FlowStep.syncing;
      _progress = 0.1;
      _progressLabel = 'Reading events…';
    });
    try {
      final deviceId = await _service.deviceId();
      final rangeStart = DateTime.now().subtract(const Duration(days: 90));
      final rangeEnd = DateTime.now().add(const Duration(days: 365));
      final events = await _service.getSelectedCalendarEvents(
        calendarIds: selected.map((c) => c.id),
        start: rangeStart,
        end: rangeEnd,
      );
      if (!mounted) return;
      setState(() {
        _progress = 0.55;
        _progressLabel = 'Uploading ${events.length} events…';
      });

      await ref.read(calendarConnectionsRepositoryProvider).syncEventKit(
            deviceId: deviceId,
            deviceLabel: 'iPhone',
            calendars: _calendars.map((c) => c.toApiJson()).toList(),
            events: events.map((e) => e.toApiJson()).toList(),
            reconcileDeletes: true,
            rangeStart: rangeStart,
            rangeEnd: rangeEnd,
          );

      invalidateCalendarStatus(ref);
      ref.read(calendarDataVersionProvider.notifier).bump();
      if (!mounted) return;
      setState(() {
        _progress = 1;
        _progressLabel = 'Done';
        _step = _FlowStep.done;
        _busy = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _step = _FlowStep.select;
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Apple Calendar',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: DayPilotColors.error.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: DayPilotColors.error.withValues(alpha: 0.35),
                ),
              ),
              child: Text(
                _error!,
                style: const TextStyle(color: DayPilotColors.error),
              ),
            ),
            const SizedBox(height: 12),
            if (_step == _FlowStep.permission ||
                (_error?.contains('denied') ?? false))
              OutlinedButton(
                onPressed: () => _service.openSystemSettings(),
                child: const Text('Open Settings'),
              ),
            const SizedBox(height: 12),
          ],
          if (_step == _FlowStep.explain) _explainCard(),
          if (_step == _FlowStep.permission) _permissionCard(),
          if (_step == _FlowStep.select) _selectCard(),
          if (_step == _FlowStep.syncing) _syncCard(),
          if (_step == _FlowStep.done) _doneCard(),
        ],
      ),
    );
  }

  Widget _explainCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Connect Apple Calendar',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: DayPilotColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'DayPilot reads calendars already on this iPhone (including iCloud) '
          'through Apple EventKit. Sign in with Apple only signs you in — '
          'it does not grant calendar access.\n\n'
          'You will choose which calendars to import. Google or Outlook '
          'calendars already connected in DayPilot are skipped to avoid duplicates.',
          style: TextStyle(
            color: DayPilotColors.textSecondary,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _busy ? null : _continueFromExplain,
          child: const Text('Continue'),
        ),
        TextButton(
          onPressed: () => context.pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }

  Widget _permissionCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Allow calendar access',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: DayPilotColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'DayPilot uses calendar access to display, organize, create, update, '
          'and synchronize your events.',
          style: TextStyle(color: DayPilotColors.textSecondary, height: 1.4),
        ),
        const SizedBox(height: 16),
        if (_busy) const LinearProgressIndicator(color: DayPilotColors.brand500),
        if (!_busy)
          FilledButton(
            onPressed: _requestPermissionAndDiscover,
            child: const Text('Allow access'),
          ),
      ],
    );
  }

  Widget _selectCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Select calendars to use in DayPilot',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: DayPilotColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            TextButton(
              onPressed: () => _selectAll(true),
              child: const Text('Select all'),
            ),
            TextButton(
              onPressed: () => _selectAll(false),
              child: const Text('Deselect all'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._calendars.map((c) {
          return CheckboxListTile(
            value: c.isSelected,
            onChanged: c.duplicatePrevented
                ? null
                : (v) => setState(() => c.isSelected = v ?? false),
            title: Text(
              c.title,
              style: const TextStyle(
                color: DayPilotColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            subtitle: Text(
              [
                sourceClassLabel(c.sourceClass),
                if (c.isReadOnly) 'Read-only',
                if (c.duplicatePrevented) c.duplicateReason,
              ].whereType<String>().join(' · '),
              style: TextStyle(
                color: c.duplicatePrevented
                    ? DayPilotColors.warning
                    : DayPilotColors.textSecondary,
                fontSize: 12,
              ),
            ),
            activeColor: DayPilotColors.brand500,
          );
        }),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _busy ? null : _runSync,
          child: const Text('Continue'),
        ),
        TextButton(
          onPressed: () => context.pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }

  Widget _syncCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Synchronizing…',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: DayPilotColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        LinearProgressIndicator(
          value: _progress,
          color: DayPilotColors.brand500,
        ),
        const SizedBox(height: 8),
        Text(
          _progressLabel,
          style: const TextStyle(color: DayPilotColors.textSecondary),
        ),
      ],
    );
  }

  Widget _doneCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Apple Calendar connected',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: DayPilotColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Selected calendars are importing into DayPilot. '
          'Events appear on Calendar here and on the web.',
          style: TextStyle(color: DayPilotColors.textSecondary, height: 1.4),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => context.go('/calendar'),
          child: const Text('Open calendar'),
        ),
        TextButton(
          onPressed: () => context.go('/sync'),
          child: const Text('Back to Sync'),
        ),
      ],
    );
  }
}
