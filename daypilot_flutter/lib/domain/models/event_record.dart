/// Maps to Supabase `events` (legacy DayPilot schema: `start` / `end`, `calendar_id`, `user_id`).
class EventRecord {
  const EventRecord({
    required this.id,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.description,
    this.location,
    this.ownerId,
    this.calendarId,
    this.externalCalendarId,
    this.calendarColor,
    this.workspaceId,
    this.allDay = false,
    this.status = 'scheduled',
    this.source = 'native',
    this.syncDirection,
  });

  final String id;
  final String title;
  final String? description;
  final String? location;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? ownerId;
  final String? calendarId;
  final String? externalCalendarId;
  final String? calendarColor;
  final String? workspaceId;
  final bool allDay;
  final String status;
  final String source;
  final String? syncDirection;

  /// Only events the user created in DayPilot. Imported calendars are read-only.
  bool get canDelete =>
      source == 'native' && syncDirection != 'imported';

  bool get isSyncedExternal =>
      source == 'google' ||
      source == 'outlook' ||
      source == 'apple' ||
      source == 'apple_eventkit';

  bool get isAppleEventKit =>
      source == 'apple_eventkit' || source == 'apple';

  bool get isReadOnlyOnWeb => isAppleEventKit;

  EventRecord copyWith({
    String? id,
    String? title,
    String? description,
    String? location,
    DateTime? startsAt,
    DateTime? endsAt,
    String? ownerId,
    String? calendarId,
    String? externalCalendarId,
    String? calendarColor,
    String? workspaceId,
    bool? allDay,
    String? status,
    String? source,
    String? syncDirection,
  }) {
    return EventRecord(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      location: location ?? this.location,
      startsAt: startsAt ?? this.startsAt,
      endsAt: endsAt ?? this.endsAt,
      ownerId: ownerId ?? this.ownerId,
      calendarId: calendarId ?? this.calendarId,
      externalCalendarId: externalCalendarId ?? this.externalCalendarId,
      calendarColor: calendarColor ?? this.calendarColor,
      workspaceId: workspaceId ?? this.workspaceId,
      allDay: allDay ?? this.allDay,
      status: status ?? this.status,
      source: source ?? this.source,
      syncDirection: syncDirection ?? this.syncDirection,
    );
  }

  /// Nest API `GET/PATCH /events` payload (`start` / `end` ISO strings).
  static EventRecord fromNestJson(Map<String, dynamic> json) {
    DateTime parse(String key) {
      final v = json[key];
      if (v == null) return DateTime.fromMillisecondsSinceEpoch(0);
      return DateTime.parse(v.toString());
    }

    return EventRecord(
      id: json['id'].toString(),
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      location: json['location'] as String?,
      startsAt: parse('start'),
      endsAt: parse('end'),
      ownerId: null,
      calendarId: json['calendarId']?.toString(),
      externalCalendarId: json['externalCalendarId']?.toString(),
      calendarColor: json['calendarColor'] as String?,
      workspaceId: json['workspaceId']?.toString(),
      allDay: json['allDay'] as bool? ?? false,
      status: 'scheduled',
      source: json['source'] as String? ?? 'native',
      syncDirection: json['syncDirection'] as String?,
    );
  }

  static EventRecord fromSupabaseRow(Map<String, dynamic> row) {
    DateTime parseTime(dynamic v) {
      if (v == null) return DateTime.fromMillisecondsSinceEpoch(0);
      if (v is DateTime) return v;
      return DateTime.parse(v.toString());
    }

    final start = parseTime(row['start'] ?? row['start_time']);
    final end = parseTime(row['end'] ?? row['end_time']);
    return EventRecord(
      id: row['id'].toString(),
      title: row['title'] as String? ?? '',
      description: row['description'] as String?,
      location: row['location'] as String?,
      startsAt: start,
      endsAt: end,
      ownerId: row['user_id']?.toString(),
      calendarId: row['calendar_id']?.toString(),
      workspaceId: row['workspace_id']?.toString(),
      calendarColor: row['calendar_color'] as String?,
      allDay: row['all_day'] as bool? ?? false,
      status: row['status'] as String? ?? 'scheduled',
      source: row['source'] as String? ?? 'native',
      syncDirection: row['sync_direction'] as String?,
    );
  }

  Map<String, dynamic> toInsertRow({
    required String calendarId,
    required String userId,
  }) {
    return {
      'calendar_id': calendarId,
      if (workspaceId != null) 'workspace_id': workspaceId,
      'user_id': userId,
      'title': title,
      'description': description,
      'location': location,
      'start': startsAt.toUtc().toIso8601String(),
      'end': endsAt.toUtc().toIso8601String(),
      'all_day': allDay,
      'status': status,
    };
  }

  Map<String, dynamic> toUpdateRow() {
    return {
      'title': title,
      'description': description,
      'location': location,
      'start': startsAt.toUtc().toIso8601String(),
      'end': endsAt.toUtc().toIso8601String(),
      'all_day': allDay,
      'status': status,
      if (workspaceId != null) 'workspace_id': workspaceId,
    };
  }
}
