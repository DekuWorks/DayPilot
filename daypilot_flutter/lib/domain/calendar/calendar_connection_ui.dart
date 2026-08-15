import '../../data/repositories/calendar_connections_repository.dart';

/// One honest status per calendar provider. No stacked “Connected” + “expired”.
enum CalendarUiTone { healthy, needsAttention, notConnected }

enum SyncAllHint { needsReconnect, lastSynced, neverSynced, noneConnected }

class CalendarProviderUi {
  const CalendarProviderUi({
    required this.id,
    required this.name,
    required this.tone,
    required this.headline,
    required this.detail,
    this.lastSynced,
    this.connectionId,
    this.canReconnect = false,
    this.canSync = false,
    this.calendarCount = 0,
  });

  final String id;
  final String name;
  final CalendarUiTone tone;
  final String headline;
  final String detail;
  final DateTime? lastSynced;
  final String? connectionId;
  final bool canReconnect;
  final bool canSync;
  final int calendarCount;

  bool get isPresent => tone != CalendarUiTone.notConnected;
}

CalendarConnection? connectionForProvider(
  List<CalendarConnection> connections,
  String provider,
) {
  for (final c in connections) {
    if (c.provider == provider) return c;
  }
  return null;
}

CalendarProviderUi mapOAuthProviderUi({
  required String id,
  required String name,
  CalendarConnection? connection,
}) {
  if (connection == null) {
    return CalendarProviderUi(
      id: id,
      name: name,
      tone: CalendarUiTone.notConnected,
      headline: 'Not connected',
      detail: '',
    );
  }

  switch (connection.status) {
    case ConnectionValidationStatus.expired:
      return CalendarProviderUi(
        id: id,
        name: name,
        tone: CalendarUiTone.needsAttention,
        headline: 'Token expired',
        detail: connection.email,
        lastSynced: connection.syncedAt,
        connectionId: connection.id,
        canReconnect: true,
      );
    case ConnectionValidationStatus.needsReconnect:
      return CalendarProviderUi(
        id: id,
        name: name,
        tone: CalendarUiTone.needsAttention,
        headline: 'Needs reconnect',
        detail: connection.email,
        lastSynced: connection.syncedAt,
        connectionId: connection.id,
        canReconnect: true,
      );
    case ConnectionValidationStatus.valid:
    case ConnectionValidationStatus.unknown:
      return CalendarProviderUi(
        id: id,
        name: name,
        tone: CalendarUiTone.healthy,
        headline: 'Connected',
        detail: connection.email,
        lastSynced: connection.syncedAt,
        connectionId: connection.id,
        canSync: true,
      );
  }
}

/// Profile/Sync Apple row = EventKit, never Sign in with Apple.
CalendarProviderUi mapAppleEventKitUi(Map<String, dynamic>? eventKitStatus) {
  final connections = (eventKitStatus?['connections'] as List?) ?? const [];
  if (connections.isEmpty) {
    return const CalendarProviderUi(
      id: 'apple',
      name: 'Apple',
      tone: CalendarUiTone.notConnected,
      headline: 'Not connected',
      detail: '',
    );
  }

  final raw = connections.first;
  final conn = raw is Map
      ? Map<String, dynamic>.from(raw)
      : <String, dynamic>{};
  final calendars = (conn['calendars'] as List?) ?? const [];
  final displayName = (conn['displayName'] as String?)?.trim();
  final device =
      (displayName == null || displayName.isEmpty) ? 'iPhone' : displayName;
  final lastRaw = conn['lastSyncedAt']?.toString();
  final lastSynced =
      lastRaw == null || lastRaw.isEmpty ? null : DateTime.tryParse(lastRaw);

  return CalendarProviderUi(
    id: 'apple',
    name: 'Apple',
    tone: CalendarUiTone.healthy,
    headline: 'Connected',
    detail: '$device · ${calendars.length} calendars',
    lastSynced: lastSynced,
    canSync: true,
    calendarCount: calendars.length,
  );
}

List<CalendarProviderUi> buildCalendarProviderRows({
  required List<CalendarConnection> connections,
  Map<String, dynamic>? eventKitStatus,
}) {
  return [
    mapOAuthProviderUi(
      id: 'google',
      name: 'Google',
      connection: connectionForProvider(connections, 'google'),
    ),
    mapOAuthProviderUi(
      id: 'outlook',
      name: 'Outlook',
      connection: connectionForProvider(connections, 'outlook'),
    ),
    mapAppleEventKitUi(eventKitStatus),
  ];
}

SyncAllHint syncAllHint(List<CalendarProviderUi> rows) {
  if (rows.any((r) => r.tone == CalendarUiTone.needsAttention)) {
    return SyncAllHint.needsReconnect;
  }
  if (latestSyncAt(rows) != null) return SyncAllHint.lastSynced;
  if (rows.any((r) => r.tone == CalendarUiTone.healthy)) {
    return SyncAllHint.neverSynced;
  }
  return SyncAllHint.noneConnected;
}

DateTime? latestSyncAt(List<CalendarProviderUi> rows) {
  DateTime? latest;
  for (final row in rows) {
    final t = row.lastSynced;
    if (t == null) continue;
    if (latest == null || t.isAfter(latest)) latest = t;
  }
  return latest;
}
