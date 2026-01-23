import type { Task } from '@daypilot/types';

export interface TodayOverview {
  date: Date;
  totalScheduledMinutes: number;
  numberOfEvents: number;
  numberOfTasks: number;
  freeTimeMinutes: number;
  workingHoursStart: number; // minutes from midnight (e.g., 480 = 8:00 AM)
  workingHoursEnd: number; // minutes from midnight (e.g., 1020 = 5:00 PM)
}

export interface PriorityTask {
  task: Task;
  priorityScore: number; // Higher = more urgent
  reason: 'overdue' | 'due_today' | 'high_priority';
}

export type ScheduleRiskType = 
  | 'overbooked'
  | 'back_to_back'
  | 'no_break'
  | 'overlap'
  | 'task_risk';

export interface ScheduleRisk {
  type: ScheduleRiskType;
  headline: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedEvents?: LocalEvent[];
  affectedTasks?: Task[];
}

export interface TaskSuggestion {
  type: 'schedule_task';
  task: Task;
  suggestedStart: Date;
  suggestedEnd: Date;
  reason: string;
  priorityScore: number;
}

export interface BreakSuggestion {
  type: 'add_break';
  suggestedStart: Date;
  suggestedEnd: Date;
  duration: number; // minutes
  reason: string;
}

export interface MoveEventSuggestion {
  type: 'move_event';
  event: LocalEvent;
  currentStart: Date;
  currentEnd: Date;
  suggestedStart: Date;
  suggestedEnd: Date;
  reason: string;
}

export type Suggestion = TaskSuggestion | BreakSuggestion | MoveEventSuggestion;

// Local event type (matches DashboardPage)
export interface LocalEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  all_day?: boolean;
  color?: string | null;
  icon?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
  is_recurring_instance?: boolean;
  timezone?: string | null;
  category_id?: string | null;
  calendar_id?: string;
}

export interface PilotBriefData {
  overview: TodayOverview;
  topPriorities: PriorityTask[];
  risks: ScheduleRisk[];
  suggestions: Suggestion[];
}
