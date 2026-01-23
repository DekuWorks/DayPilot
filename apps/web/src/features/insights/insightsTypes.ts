import type { Category } from '@daypilot/types';

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

export interface DayInsights {
  date: Date;
  totalScheduledMinutes: number;
  meetingMinutes: number;
  focusTimeMinutes: number;
  busyRatio: number; // scheduled / working hours
  meetingLoadPercent: number; // meeting minutes / working minutes
  avgGapMinutes: number;
  isOverbooked: boolean;
  categories: Array<{
    category: Category | null;
    minutes: number;
  }>;
}

export interface WeeklyInsights {
  days: DayInsights[];
  totalScheduledMinutes: number;
  totalMeetingMinutes: number;
  totalFocusTimeMinutes: number;
  avgBusyRatio: number;
  avgMeetingLoadPercent: number;
  avgGapMinutes: number;
  overbookedDaysCount: number;
  mostOverloadedDay: DayInsights | null;
  topCategories: Array<{
    category: Category | null;
    totalMinutes: number;
  }>;
}

