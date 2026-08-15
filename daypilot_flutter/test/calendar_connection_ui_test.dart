import 'package:daypilot_flutter/data/repositories/calendar_connections_repository.dart';
import 'package:daypilot_flutter/domain/calendar/calendar_connection_ui.dart';
import 'package:flutter_test/flutter_test.dart';

CalendarConnection _oauth({
  required String provider,
  required ConnectionValidationStatus status,
  String email = 'marcusb0611@gmail.com',
  DateTime? syncedAt,
}) {
  return CalendarConnection(
    id: '$provider-1',
    provider: provider,
    email: email,
    syncedAt: syncedAt,
    connectedAt: DateTime.utc(2026, 8, 1),
    status: status,
  );
}

void main() {
  test('Apple uses EventKit, not an apple OAuth / SiwA row', () {
    final rows = buildCalendarProviderRows(
      connections: [
        _oauth(
          provider: 'apple',
          status: ConnectionValidationStatus.valid,
          email: 'icloud@example.com',
        ),
      ],
      eventKitStatus: {
        'connections': [
          {
            'displayName': 'iPhone',
            'lastSyncedAt': '2026-08-15T18:27:23Z',
            'calendars': [
              {'title': 'Home'},
              {'title': 'Work'},
            ],
          },
        ],
      },
    );

    final apple = rows.singleWhere((r) => r.id == 'apple');
    expect(apple.tone, CalendarUiTone.healthy);
    expect(apple.headline, 'Connected');
    expect(apple.detail, 'iPhone · 2 calendars');
    expect(apple.lastSynced, DateTime.parse('2026-08-15T18:27:23Z'));
  });

  test('Apple is not connected when EventKit is empty, even if CalDAV exists',
      () {
    final rows = buildCalendarProviderRows(
      connections: [
        _oauth(
          provider: 'apple',
          status: ConnectionValidationStatus.valid,
          email: 'icloud@example.com',
        ),
      ],
      eventKitStatus: {'connections': []},
    );

    final apple = rows.singleWhere((r) => r.id == 'apple');
    expect(apple.tone, CalendarUiTone.notConnected);
    expect(apple.headline, 'Not connected');
    expect(apple.detail, isEmpty);
  });

  test('Google expired is amber attention, not healthy Connected', () {
    final ui = mapOAuthProviderUi(
      id: 'google',
      name: 'Google',
      connection: _oauth(
        provider: 'google',
        status: ConnectionValidationStatus.expired,
        syncedAt: DateTime.utc(2026, 8, 6),
      ),
    );

    expect(ui.tone, CalendarUiTone.needsAttention);
    expect(ui.headline, 'Token expired');
    expect(ui.detail, 'marcusb0611@gmail.com');
    expect(ui.canReconnect, isTrue);
    expect(ui.canSync, isFalse);
  });

  test('Google valid is healthy with email', () {
    final ui = mapOAuthProviderUi(
      id: 'google',
      name: 'Google',
      connection: _oauth(
        provider: 'google',
        status: ConnectionValidationStatus.valid,
      ),
    );

    expect(ui.tone, CalendarUiTone.healthy);
    expect(ui.headline, 'Connected');
    expect(ui.canReconnect, isFalse);
    expect(ui.canSync, isTrue);
  });

  test('missing provider is grey not-connected without a checkmark state', () {
    final ui = mapOAuthProviderUi(
      id: 'outlook',
      name: 'Outlook',
    );

    expect(ui.tone, CalendarUiTone.notConnected);
    expect(ui.headline, 'Not connected');
    expect(ui.isPresent, isFalse);
  });

  test('Sync all hint prefers Needs reconnect over last sync', () {
    final rows = buildCalendarProviderRows(
      connections: [
        _oauth(
          provider: 'google',
          status: ConnectionValidationStatus.expired,
          syncedAt: DateTime.utc(2026, 8, 6),
        ),
      ],
      eventKitStatus: {
        'connections': [
          {
            'displayName': 'iPhone',
            'lastSyncedAt': '2026-08-15T18:27:23Z',
            'calendars': [{}],
          },
        ],
      },
    );

    expect(syncAllHint(rows), SyncAllHint.needsReconnect);
    expect(latestSyncAt(rows), DateTime.parse('2026-08-15T18:27:23Z'));
  });

  test('expired label stays short', () {
    expect(ConnectionValidationStatus.expired.label, 'Token expired');
  });
}
