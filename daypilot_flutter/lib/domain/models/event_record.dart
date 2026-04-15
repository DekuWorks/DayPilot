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
    this.allDay = false,
    this.status = 'scheduled',
  });

  final String id;
  final String title;
  final String? description;
  final String? location;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? ownerId;
  final String? calendarId;
  final bool allDay;
  final String status;

  EventRecord copyWith({
    String? id,
    String? title,
    String? description,
    String? location,
    DateTime? startsAt,
    DateTime? endsAt,
    String? ownerId,
    String? calendarId,
    bool? allDay,
    String? status,
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
      allDay: allDay ?? this.allDay,
      status: status ?? this.status,
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
      allDay: row['all_day'] as bool? ?? false,
      status: row['status'] as String? ?? 'scheduled',
    );
  }

  Map<String, dynamic> toInsertRow({
    required String calendarId,
    required String userId,
  }) {
    return {
      'calendar_id': calendarId,
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
    };
  }
}
