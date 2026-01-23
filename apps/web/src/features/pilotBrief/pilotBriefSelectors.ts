import type { LocalEvent, TodayOverview, PriorityTask, ScheduleRisk, Suggestion } from './pilotBriefTypes';
import type { Task } from '@daypilot/types';
import { calculateFreeTime, findBestSlots } from './pilotBriefUtils';

const DEFAULT_WORKING_HOURS_START = 480; // 8:00 AM
const DEFAULT_WORKING_HOURS_END = 1020; // 5:00 PM

/**
 * Get today's date range in user timezone
 */
export function getTodayDateRange(): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Calculate today's overview
 */
export function calculateTodayOverview(
  events: LocalEvent[],
  tasks: Task[],
  workingHoursStart: number = DEFAULT_WORKING_HOURS_START,
  workingHoursEnd: number = DEFAULT_WORKING_HOURS_END
): TodayOverview {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get today's events
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start);
    return eventDate.toDateString() === today.toDateString();
  });
  
  // Get today's scheduled tasks (tasks that have been converted to events)
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const taskDate = new Date(t.due_date);
    return taskDate.toDateString() === today.toDateString() && t.status !== 'completed';
  });
  
  // Calculate total scheduled minutes
  let totalScheduledMinutes = 0;
  const dayStart = new Date(today);
  dayStart.setHours(Math.floor(workingHoursStart / 60), workingHoursStart % 60, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(Math.floor(workingHoursEnd / 60), workingHoursEnd % 60, 0, 0);
  
  const nonAllDayEvents = todayEvents
    .filter(e => !e.all_day)
    .map(e => ({
      start: new Date(e.start),
      end: new Date(e.end),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  if (nonAllDayEvents.length > 0) {
    const merged: Array<{ start: number; end: number }> = [{
      start: Math.max(nonAllDayEvents[0].start.getTime(), dayStart.getTime()),
      end: Math.min(nonAllDayEvents[0].end.getTime(), dayEnd.getTime()),
    }];
    
    for (let i = 1; i < nonAllDayEvents.length; i++) {
      const current = nonAllDayEvents[i];
      const last = merged[merged.length - 1];
      const currentStart = Math.max(current.start.getTime(), dayStart.getTime());
      const currentEnd = Math.min(current.end.getTime(), dayEnd.getTime());
      
      if (currentStart <= last.end) {
        last.end = Math.max(last.end, currentEnd);
      } else {
        merged.push({ start: currentStart, end: currentEnd });
      }
    }
    
    totalScheduledMinutes = merged.reduce((sum, event) => {
      return sum + (event.end - event.start) / (1000 * 60);
    }, 0);
  }
  
  const freeTimeMinutes = calculateFreeTime(events, workingHoursStart, workingHoursEnd);
  
  return {
    date: today,
    totalScheduledMinutes: Math.round(totalScheduledMinutes),
    numberOfEvents: todayEvents.length,
    numberOfTasks: todayTasks.length,
    freeTimeMinutes: Math.round(freeTimeMinutes),
    workingHoursStart,
    workingHoursEnd,
  };
}

/**
 * Get top 3 priority tasks
 */
export function getTopPriorities(
  tasks: Task[],
  maxCount: number = 3
): PriorityTask[] {
  const today = new Date().toISOString().split('T')[0];
  
  // Score tasks by priority
  const scoredTasks: PriorityTask[] = tasks
    .filter(task => task.status !== 'completed')
    .map(task => {
      let priorityScore = 0;
      let reason: 'overdue' | 'due_today' | 'high_priority' = 'high_priority';
      
      if (task.due_date) {
        const dueDate = task.due_date.split('T')[0];
        if (dueDate < today) {
          priorityScore = 100; // Overdue = highest priority
          reason = 'overdue';
        } else if (dueDate === today) {
          priorityScore = 80; // Due today = high priority
          reason = 'due_today';
        } else {
          // Future date: score based on priority level
          const daysUntilDue = Math.floor(
            (new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
          );
          priorityScore = Math.max(0, 60 - daysUntilDue);
        }
      }
      
      // Boost score for high priority tasks
      if (task.priority === 'high') {
        priorityScore += 20;
        if (reason === 'high_priority') {
          reason = 'high_priority';
        }
      } else if (task.priority === 'medium') {
        priorityScore += 10;
      }
      
      return {
        task,
        priorityScore,
        reason,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxCount);
  
  return scoredTasks;
}

/**
 * Generate smart suggestions
 */
export function generateSuggestions(
  events: LocalEvent[],
  tasks: Task[],
  risks: ScheduleRisk[],
  workingHoursStart: number = DEFAULT_WORKING_HOURS_START,
  workingHoursEnd: number = DEFAULT_WORKING_HOURS_END
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const todayString = new Date().toISOString().split('T')[0];
  
  // 1. Task placement suggestions
  const unscheduledTasks = tasks.filter(
    task => task.status !== 'completed' && 
    !task.converted_to_event_id &&
    task.due_date
  );
  
  const topTasks = unscheduledTasks
    .map(task => {
      const dueDate = task.due_date?.split('T')[0] || '';
      let priority = 0;
      if (dueDate < todayString) priority = 100;
      else if (dueDate === todayString) priority = 80;
      else priority = 60;
      if (task.priority === 'high') priority += 20;
      return { task, priority };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2); // Top 2 tasks
  
  for (const { task } of topTasks) {
    const slots = findBestSlots(task, events, workingHoursStart, workingHoursEnd, 2);
    for (const slot of slots) {
      const dueDate = task.due_date?.split('T')[0] || '';
      let reason = 'Available time slot';
      if (dueDate < todayString) {
        reason = 'Overdue task needs scheduling';
      } else if (dueDate === todayString) {
        reason = 'Task due today';
      }
      
      suggestions.push({
        type: 'schedule_task',
        task,
        suggestedStart: slot.start,
        suggestedEnd: slot.end,
        reason,
        priorityScore: slot.score,
      });
    }
  }
  
  // 2. Break suggestions (if no-break risk exists)
  const noBreakRisk = risks.find(r => r.type === 'no_break');
  if (noBreakRisk && events.length > 0) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayEvents = events
      .filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.toDateString() === todayDate.toDateString() && !e.all_day;
      })
      .map(e => ({
        start: new Date(e.start),
        end: new Date(e.end),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Find a good spot for a break (after 2-3 hours of events)
    if (todayEvents.length >= 2) {
      const midPoint = Math.floor(todayEvents.length / 2);
      const breakStart = new Date(todayEvents[midPoint].end);
      const breakEnd = new Date(breakStart.getTime() + 15 * 60 * 1000); // 15 min break
      
      // Check if this slot is free
      const conflicts = todayEvents.filter(e => 
        (breakStart >= e.start && breakStart < e.end) ||
        (breakEnd > e.start && breakEnd <= e.end) ||
        (breakStart <= e.start && breakEnd >= e.end)
      );
      
      if (conflicts.length === 0) {
        suggestions.push({
          type: 'add_break',
          suggestedStart: breakStart,
          suggestedEnd: breakEnd,
          duration: 15,
          reason: 'Add a break to avoid burnout',
        });
      }
    }
  }
  
  // Sort suggestions by priority
  return suggestions.sort((a, b) => {
    if (a.type === 'schedule_task' && b.type === 'schedule_task') {
      return b.priorityScore - a.priorityScore;
    }
    if (a.type === 'schedule_task') return -1;
    if (b.type === 'schedule_task') return 1;
    return 0;
  });
}
