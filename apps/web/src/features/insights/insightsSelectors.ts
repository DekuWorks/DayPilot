import type { LocalEvent, DayInsights, WeeklyInsights } from './insightsTypes';
import type { Category } from '@daypilot/types';

const DEFAULT_WORKING_HOURS_START = 480; // 8:00 AM
const DEFAULT_WORKING_HOURS_END = 1020; // 5:00 PM

/**
 * Check if an event is a meeting based on category or title
 */
function isMeetingEvent(event: LocalEvent, categories: Category[]): boolean {
  if (event.category_id) {
    const category = categories.find(c => c.id === event.category_id);
    if (category) {
      const name = category.name.toLowerCase();
      return name.includes('meeting') || name.includes('call') || name.includes('sync');
    }
  }
  const title = event.title.toLowerCase();
  return title.includes('meeting') || title.includes('call') || title.includes('sync');
}

/**
 * Check if an event is focus time based on category or title
 */
function isFocusTimeEvent(event: LocalEvent, categories: Category[]): boolean {
  if (event.category_id) {
    const category = categories.find(c => c.id === event.category_id);
    if (category) {
      const name = category.name.toLowerCase();
      return name.includes('focus') || name.includes('deep work') || name.includes('work block');
    }
  }
  const title = event.title.toLowerCase();
  return title.includes('focus') || title.includes('deep work') || title.includes('work block');
}

/**
 * Calculate insights for a single day
 */
export function calculateDayInsights(
  date: Date,
  events: LocalEvent[],
  categories: Category[],
  workingHoursStart: number = DEFAULT_WORKING_HOURS_START,
  workingHoursEnd: number = DEFAULT_WORKING_HOURS_END
): DayInsights {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const workingStart = new Date(date);
  workingStart.setHours(Math.floor(workingHoursStart / 60), workingHoursStart % 60, 0, 0);
  const workingEnd = new Date(date);
  workingEnd.setHours(Math.floor(workingHoursEnd / 60), workingHoursEnd % 60, 0, 0);
  
  const totalWorkingMinutes = workingHoursEnd - workingHoursStart;
  
  // Get today's events
  const dayEvents = events
    .filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === date.toDateString() && !e.all_day;
    })
    .map(e => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      return {
        ...e,
        start,
        end,
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Calculate total scheduled minutes (merged to avoid double-counting overlaps)
  let totalScheduledMinutes = 0;
  let meetingMinutes = 0;
  let focusTimeMinutes = 0;
  const categoryMinutes = new Map<string, number>();
  
  if (dayEvents.length > 0) {
    const merged: Array<{ start: number; end: number; event: LocalEvent }> = [{
      start: Math.max(dayEvents[0].start.getTime(), workingStart.getTime()),
      end: Math.min(dayEvents[0].end.getTime(), workingEnd.getTime()),
      event: {
        ...dayEvents[0],
        start: dayEvents[0].start.toISOString(),
        end: dayEvents[0].end.toISOString(),
      },
    }];
    
    for (let i = 1; i < dayEvents.length; i++) {
      const current = dayEvents[i];
      const last = merged[merged.length - 1];
      const currentStart = Math.max(current.start.getTime(), workingStart.getTime());
      const currentEnd = Math.min(current.end.getTime(), workingEnd.getTime());
      
      if (currentStart <= last.end) {
        // Overlap - extend the merged block
        last.end = Math.max(last.end, currentEnd);
      } else {
        merged.push({ 
          start: currentStart, 
          end: currentEnd, 
          event: {
            ...current,
            start: current.start.toISOString(),
            end: current.end.toISOString(),
          }
        });
      }
    }
    
    // Calculate minutes and categorize
    for (const block of merged) {
      const minutes = (block.end - block.start) / (1000 * 60);
      totalScheduledMinutes += minutes;
      
      if (isMeetingEvent(block.event, categories)) {
        meetingMinutes += minutes;
      }
      if (isFocusTimeEvent(block.event, categories)) {
        focusTimeMinutes += minutes;
      }
      
      // Track category minutes
      const categoryId = block.event.category_id || 'none';
      categoryMinutes.set(categoryId, (categoryMinutes.get(categoryId) || 0) + minutes);
    }
  }
  
  // Calculate gaps
  let totalGapMinutes = 0;
  let gapCount = 0;
  
  if (dayEvents.length > 0) {
    // Gap before first event
    const firstGap = (dayEvents[0].start.getTime() - workingStart.getTime()) / (1000 * 60);
    if (firstGap > 0) {
      totalGapMinutes += firstGap;
      gapCount++;
    }
    
    // Gaps between events
    for (let i = 0; i < dayEvents.length - 1; i++) {
      const gap = (dayEvents[i + 1].start.getTime() - dayEvents[i].end.getTime()) / (1000 * 60);
      if (gap > 0) {
        totalGapMinutes += gap;
        gapCount++;
      }
    }
    
    // Gap after last event
    const lastGap = (workingEnd.getTime() - dayEvents[dayEvents.length - 1].end.getTime()) / (1000 * 60);
    if (lastGap > 0) {
      totalGapMinutes += lastGap;
      gapCount++;
    }
  } else {
    // No events = full day is a gap
    totalGapMinutes = totalWorkingMinutes;
    gapCount = 1;
  }
  
  const avgGapMinutes = gapCount > 0 ? totalGapMinutes / gapCount : 0;
  const busyRatio = totalWorkingMinutes > 0 ? totalScheduledMinutes / totalWorkingMinutes : 0;
  const meetingLoadPercent = totalWorkingMinutes > 0 ? (meetingMinutes / totalWorkingMinutes) * 100 : 0;
  const isOverbooked = busyRatio > 0.85; // 85% threshold
  
  // Build category breakdown
  const categoryBreakdown = Array.from(categoryMinutes.entries())
    .map(([categoryId, minutes]) => ({
      category: categoryId === 'none' ? null : categories.find(c => c.id === categoryId) || null,
      minutes,
    }))
    .sort((a, b) => b.minutes - a.minutes);
  
  return {
    date,
    totalScheduledMinutes: Math.round(totalScheduledMinutes),
    meetingMinutes: Math.round(meetingMinutes),
    focusTimeMinutes: Math.round(focusTimeMinutes),
    busyRatio,
    meetingLoadPercent,
    avgGapMinutes: Math.round(avgGapMinutes),
    isOverbooked,
    categories: categoryBreakdown,
  };
}

/**
 * Calculate weekly insights
 */
export function calculateWeeklyInsights(
  events: LocalEvent[],
  categories: Category[],
  workingHoursStart: number = DEFAULT_WORKING_HOURS_START,
  workingHoursEnd: number = DEFAULT_WORKING_HOURS_END
): WeeklyInsights {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get start of week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  // Calculate insights for each day of the week
  const days: DayInsights[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(calculateDayInsights(day, events, categories, workingHoursStart, workingHoursEnd));
  }
  
  // Aggregate metrics
  const totalScheduledMinutes = days.reduce((sum, day) => sum + day.totalScheduledMinutes, 0);
  const totalMeetingMinutes = days.reduce((sum, day) => sum + day.meetingMinutes, 0);
  const totalFocusTimeMinutes = days.reduce((sum, day) => sum + day.focusTimeMinutes, 0);
  const avgBusyRatio = days.reduce((sum, day) => sum + day.busyRatio, 0) / 7;
  const avgMeetingLoadPercent = days.reduce((sum, day) => sum + day.meetingLoadPercent, 0) / 7;
  const avgGapMinutes = days.reduce((sum, day) => sum + day.avgGapMinutes, 0) / 7;
  const overbookedDaysCount = days.filter(day => day.isOverbooked).length;
  
  // Find most overloaded day
  const mostOverloadedDay = days.reduce((max, day) => 
    day.busyRatio > (max?.busyRatio || 0) ? day : max, 
    null as DayInsights | null
  );
  
  // Aggregate categories across the week
  const categoryTotals = new Map<string, { category: Category | null; totalMinutes: number }>();
  days.forEach(day => {
    day.categories.forEach(({ category, minutes }) => {
      const categoryId = category?.id || 'none';
      const existing = categoryTotals.get(categoryId);
      if (existing) {
        existing.totalMinutes += minutes;
      } else {
        categoryTotals.set(categoryId, { category, totalMinutes: minutes });
      }
    });
  });
  
  const topCategories = Array.from(categoryTotals.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 5);
  
  return {
    days,
    totalScheduledMinutes,
    totalMeetingMinutes,
    totalFocusTimeMinutes,
    avgBusyRatio,
    avgMeetingLoadPercent,
    avgGapMinutes,
    overbookedDaysCount,
    mostOverloadedDay,
    topCategories,
  };
}

/**
 * Calculate summary insights for today
 */
export interface InsightsSummary {
  meetingLoadPercent: number;
  focusTimeMinutes: number;
  busyRatio: number;
  avgGapMinutes: number;
  overbookedDaysThisWeek: number;
  isOverbooked: boolean;
}

export function calculateInsightsSummary(
  events: LocalEvent[],
  categories: Category[],
  workingHoursStart: number = DEFAULT_WORKING_HOURS_START,
  workingHoursEnd: number = DEFAULT_WORKING_HOURS_END
): InsightsSummary {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayInsights = calculateDayInsights(today, events, categories, workingHoursStart, workingHoursEnd);
  
  // Calculate weekly insights for overbooked days count
  const weeklyInsights = calculateWeeklyInsights(events, categories, workingHoursStart, workingHoursEnd);
  
  return {
    meetingLoadPercent: todayInsights.meetingLoadPercent,
    focusTimeMinutes: todayInsights.focusTimeMinutes,
    busyRatio: todayInsights.busyRatio,
    avgGapMinutes: todayInsights.avgGapMinutes,
    overbookedDaysThisWeek: weeklyInsights.overbookedDaysCount,
    isOverbooked: todayInsights.isOverbooked,
  };
}
