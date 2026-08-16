import 'package:daypilot_flutter/data/services/pilot_brief_api.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses Edge Function brief payload', () {
    final brief = PilotBrief.fromJson({
      'id': 'b1',
      'brief_date': '2026-08-15',
      'content': {
        'summary': 'Hello Marcus',
        'events_today': 2,
        'tasks_due': 1,
        'tasks_overdue': 0,
        'suggestions': ['Protect a focus block'],
        'conflicts': [],
        'focus_windows': ['09:00–11:00'],
        'follow_ups': ['What should I tackle first?'],
        'source': 'ai',
      },
      'created_at': '2026-08-15T12:00:00Z',
      'updated_at': '2026-08-15T12:00:00Z',
    });
    expect(brief.content.isAi, isTrue);
    expect(brief.content.eventsToday, 2);
    expect(brief.content.focusWindows, ['09:00–11:00']);
    expect(brief.content.followUps, ['What should I tackle first?']);
    expect(brief.content.chips(), ['What should I tackle first?']);
    expect(brief.content.summary, 'Hello Marcus');
  });

  test('parses chat payload and derives chips from an older brief', () {
    final result = PilotChatResult.fromJson({
      'source': 'ai',
      'user_message': {
        'id': 'u1',
        'brief_date': '2026-08-15',
        'role': 'user',
        'content': 'What should I tackle first?',
        'follow_ups': [],
        'created_at': '2026-08-15T12:00:00Z',
      },
      'reply': {
        'id': 'a1',
        'brief_date': '2026-08-15',
        'role': 'assistant',
        'content': 'Clear the overdue task, then protect a focus block.',
        'follow_ups': ['Which focus window should I protect?'],
        'created_at': '2026-08-15T12:00:01Z',
      },
    });
    expect(result.reply.isUser, isFalse);
    expect(result.userMessage.isUser, isTrue);
    expect(result.reply.followUps, ['Which focus window should I protect?']);

    final older = PilotBriefContent.fromJson({
      'summary': 'Busy day',
      'events_today': 3,
      'tasks_due': 1,
      'tasks_overdue': 2,
      'suggestions': [],
      'conflicts': ['Stand-up overlaps 1:1'],
      'focus_windows': ['14:00–16:00'],
      'source': 'fallback',
    });
    expect(older.followUps, isEmpty);
    expect(
      older.chips().first,
      'Which overdue task should I clear first?',
    );
  });

  test('todayBriefDate is ISO date', () {
    expect(todayBriefDate().length, 10);
    expect(todayBriefDate().contains('-'), isTrue);
  });
}
