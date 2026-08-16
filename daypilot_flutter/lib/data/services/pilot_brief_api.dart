import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/daypilot_env.dart';

/// Same contract as `apps/web/src/lib/pilot-brief-api.ts`.
class PilotBrief {
  const PilotBrief({
    required this.id,
    required this.briefDate,
    required this.content,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String briefDate;
  final PilotBriefContent content;
  final String? createdAt;
  final String? updatedAt;

  factory PilotBrief.fromJson(Map<String, dynamic> json) {
    final raw = json['content'];
    return PilotBrief(
      id: '${json['id'] ?? ''}',
      briefDate: '${json['brief_date'] ?? ''}',
      content: PilotBriefContent.fromJson(
        raw is Map ? Map<String, dynamic>.from(raw) : const {},
      ),
      createdAt: json['created_at']?.toString(),
      updatedAt: json['updated_at']?.toString(),
    );
  }
}

class PilotBriefContent {
  const PilotBriefContent({
    required this.summary,
    required this.eventsToday,
    required this.tasksDue,
    required this.tasksOverdue,
    required this.suggestions,
    required this.conflicts,
    required this.focusWindows,
    required this.followUps,
    required this.source,
  });

  final String summary;
  final int eventsToday;
  final int tasksDue;
  final int tasksOverdue;
  final List<String> suggestions;
  final List<String> conflicts;
  final List<String> focusWindows;
  final List<String> followUps;
  final String source;

  bool get isAi => source == 'ai';

  factory PilotBriefContent.fromJson(Map<String, dynamic> json) {
    return PilotBriefContent(
      summary: '${json['summary'] ?? ''}',
      eventsToday: _asInt(json['events_today']),
      tasksDue: _asInt(json['tasks_due']),
      tasksOverdue: _asInt(json['tasks_overdue']),
      suggestions: _stringList(json['suggestions']),
      conflicts: _stringList(json['conflicts']),
      focusWindows: _stringList(json['focus_windows']),
      followUps: _stringList(json['follow_ups']),
      source: '${json['source'] ?? 'fallback'}',
    );
  }

  List<String> chips() {
    if (followUps.isNotEmpty) return followUps.take(3).toList();
    final out = <String>[];
    if (tasksOverdue > 0) {
      out.add('Which overdue task should I clear first?');
    }
    if (conflicts.isNotEmpty) {
      out.add('How should I resolve today\'s overlap?');
    }
    if (focusWindows.isNotEmpty) {
      out.add('Which focus window should I protect?');
    }
    if (out.length < 3) out.add('What should I tackle first?');
    return out.take(3).toList();
  }
}

class PilotChatMessage {
  const PilotChatMessage({
    required this.id,
    required this.briefDate,
    required this.role,
    required this.content,
    required this.followUps,
    this.createdAt,
  });

  final String id;
  final String briefDate;
  final String role;
  final String content;
  final List<String> followUps;
  final String? createdAt;

  bool get isUser => role == 'user';

  factory PilotChatMessage.fromJson(Map<String, dynamic> json) {
    return PilotChatMessage(
      id: '${json['id'] ?? ''}',
      briefDate: '${json['brief_date'] ?? ''}',
      role: '${json['role'] ?? ''}',
      content: '${json['content'] ?? ''}',
      followUps: _stringList(json['follow_ups']),
      createdAt: json['created_at']?.toString(),
    );
  }
}

class PilotChatResult {
  const PilotChatResult({
    required this.userMessage,
    required this.reply,
    required this.source,
  });

  final PilotChatMessage userMessage;
  final PilotChatMessage reply;
  final String source;

  factory PilotChatResult.fromJson(Map<String, dynamic> json) {
    final user = json['user_message'];
    final reply = json['reply'];
    if (user is! Map || reply is! Map) {
      throw Exception('Pilot chat response missing messages');
    }
    return PilotChatResult(
      userMessage: PilotChatMessage.fromJson(Map<String, dynamic>.from(user)),
      reply: PilotChatMessage.fromJson(Map<String, dynamic>.from(reply)),
      source: '${json['source'] ?? 'fallback'}',
    );
  }
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

List<String> _stringList(Object? raw) {
  if (raw is! List) return const [];
  return raw.map((e) => '$e').where((s) => s.isNotEmpty).toList();
}

String todayBriefDate() => DateTime.now().toIso8601String().substring(0, 10);

Future<PilotBrief?> getTodayBrief(SupabaseClient client) async {
  final row = await client
      .from('pilot_briefs')
      .select('id, brief_date, content, created_at, updated_at')
      .eq('brief_date', todayBriefDate())
      .maybeSingle();
  if (row == null) return null;
  return PilotBrief.fromJson(Map<String, dynamic>.from(row));
}

Uri pilotBriefFunctionUri() {
  final base = DayPilotEnv.supabaseUrl.trim();
  if (base.isEmpty) {
    throw Exception('Missing SUPABASE_URL dart-define');
  }
  return Uri.parse('$base/functions/v1/pilot-brief');
}

Future<PilotBrief> generatePilotBrief({
  required SupabaseClient client,
  String? date,
  http.Client? httpClient,
}) async {
  final session = client.auth.currentSession;
  if (session == null) throw Exception('Not signed in');
  if (DayPilotEnv.supabaseAnonKey.isEmpty) {
    throw Exception('Missing SUPABASE_ANON_KEY dart-define');
  }

  final transport = httpClient ?? http.Client();
  final owned = httpClient == null;
  try {
    final res = await transport.post(
      pilotBriefFunctionUri(),
      headers: {
        'Authorization': 'Bearer ${session.accessToken}',
        'apikey': DayPilotEnv.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'date': ?date}),
    );
    final payload = jsonDecode(res.body.isEmpty ? '{}' : res.body);
    if (res.statusCode >= 400) {
      final error = payload is Map ? payload['error'] : null;
      throw Exception(error ?? 'Failed to generate Pilot Brief');
    }
    if (payload is! Map || payload['brief'] is! Map) {
      throw Exception('Pilot Brief response missing brief');
    }
    return PilotBrief.fromJson(
      Map<String, dynamic>.from(payload['brief'] as Map),
    );
  } finally {
    if (owned) transport.close();
  }
}

Future<List<PilotChatMessage>> getTodayChat(SupabaseClient client) async {
  final rows = await client
      .from('pilot_brief_messages')
      .select('id, brief_date, role, content, follow_ups, created_at')
      .eq('brief_date', todayBriefDate())
      .order('created_at', ascending: true);
  return (rows as List)
      .map((e) => PilotChatMessage.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
}

Future<PilotChatResult> sendPilotBriefChat({
  required SupabaseClient client,
  required String message,
  String? date,
  http.Client? httpClient,
}) async {
  final session = client.auth.currentSession;
  if (session == null) throw Exception('Not signed in');
  if (DayPilotEnv.supabaseAnonKey.isEmpty) {
    throw Exception('Missing SUPABASE_ANON_KEY dart-define');
  }

  final transport = httpClient ?? http.Client();
  final owned = httpClient == null;
  try {
    final res = await transport.post(
      pilotBriefFunctionUri(),
      headers: {
        'Authorization': 'Bearer ${session.accessToken}',
        'apikey': DayPilotEnv.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'chat',
        'message': message,
        'date': ?date,
      }),
    );
    final payload = jsonDecode(res.body.isEmpty ? '{}' : res.body);
    if (res.statusCode >= 400) {
      final error = payload is Map ? payload['error'] : null;
      throw Exception(error ?? 'Failed to send message');
    }
    if (payload is! Map) {
      throw Exception('Pilot chat response missing messages');
    }
    return PilotChatResult.fromJson(Map<String, dynamic>.from(payload));
  } finally {
    if (owned) transport.close();
  }
}
