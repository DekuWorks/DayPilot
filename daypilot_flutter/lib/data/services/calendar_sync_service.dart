import 'package:url_launcher/url_launcher.dart';

import '../repositories/calendar_connections_repository.dart';
import 'apple_calendar_service.dart';

/// Shared sync / reconnect actions for Profile and Sync.
class CalendarSyncService {
  CalendarSyncService(this._repo, {AppleCalendarService? apple})
      : _apple = apple ?? AppleCalendarService();

  final CalendarConnectionsRepository _repo;
  final AppleCalendarService _apple;

  Future<void> syncOAuth(String connectionId) => _repo.sync(connectionId);

  Future<String> getConnectUrl(String provider) => _repo.getConnectUrl(provider);

  Future<bool> launchConnect(String provider) async {
    final url = await getConnectUrl(provider);
    return launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Future<void> disconnect(String connectionId) => _repo.disconnect(connectionId);

  /// Sync healthy / expired-with-refresh OAuth connections, then EventKit.
  Future<int> syncAll({
    required List<CalendarConnection> connections,
    Map<String, dynamic>? eventKitStatus,
  }) async {
    var count = 0;
    for (final c in connections) {
      if (c.provider == 'apple' || c.provider == 'apple_eventkit') continue;
      if (c.status == ConnectionValidationStatus.needsReconnect) continue;
      await _repo.sync(c.id);
      count++;
    }
    final didEventKit = await syncEventKitIncremental(eventKitStatus);
    if (didEventKit) count++;
    return count;
  }

  Future<bool> syncEventKitIncremental(
    Map<String, dynamic>? eventKitStatus,
  ) async {
    if (!AppleCalendarService.isSupported) return false;
    final connections = (eventKitStatus?['connections'] as List?) ?? const [];
    if (connections.isEmpty) return false;

    final deviceId = await _apple.deviceId();
    final conn = connections.cast<dynamic>().firstWhere(
          (c) => (c as Map)['deviceId'] == deviceId,
          orElse: () => connections.first,
        ) as Map;
    final calendars = (conn['calendars'] as List? ?? [])
        .cast<dynamic>()
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((c) => c['isSelected'] == true)
        .toList();
    if (calendars.isEmpty) return false;

    final events = await _apple.getSelectedCalendarEvents(
      calendarIds: calendars.map((c) => c['externalCalendarId'] as String),
    );
    await _repo.syncEventKit(
      deviceId: deviceId,
      deviceLabel: (conn['displayName'] as String?) ?? 'iPhone',
      calendars: calendars
          .map(
            (c) => {
              'externalCalendarId': c['externalCalendarId'],
              'title': c['title'],
              'calendarType': c['calendarType'],
              'sourceName': c['sourceName'],
              'color': c['color'],
              'isPrimary': c['isPrimary'] == true,
              'isReadOnly': c['isReadOnly'] == true,
              'isSelected': true,
              'isVisible': c['isVisible'] != false,
            },
          )
          .toList(),
      events: events.map((e) => e.toApiJson()).toList(),
    );
    return true;
  }
}
