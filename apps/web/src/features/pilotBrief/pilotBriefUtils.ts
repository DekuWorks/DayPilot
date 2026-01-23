import type { LocalEvent, ScheduleRisk } from './pilotBriefTypes';
import type { Task } from '@daypilot/types';

/**
 * Calculate free time within working hours
 */
export function calculateFreeTime(
  events: LocalEvent[],
  workingHoursStart: number,
  workingHoursEnd: number
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(today);
  dayStart.setHours(Math.floor(workingHoursStart / 60), workingHoursStart % 60, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(Math.floor(workingHoursEnd / 60), workingHoursEnd % 60, 0, 0);

  const totalMinutes = workingHoursEnd - workingHoursStart;
  
  // Get all events for today that fall within working hours
  const todayEvents = events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Check if event overlaps with working hours
    return eventStart.toDateString() === today.toDateString() &&
           !event.all_day &&
           eventStart < dayEnd &&
           eventEnd > dayStart;
  });

  // Calculate total scheduled minutes
  let scheduledMinutes = 0;
  const sortedEvents = todayEvents
    .map(e => ({
      start: Math.max(new Date(e.start).getTime(), dayStart.getTime()),
      end: Math.min(new Date(e.end).getTime(), dayEnd.getTime()),
    }))
    .sort((a, b) => a.start - b.start);

  // Merge overlapping events
  if (sortedEvents.length > 0) {
    const merged: Array<{ start: number; end: number }> = [sortedEvents[0]];
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const current = sortedEvents[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    
    scheduledMinutes = merged.reduce((sum, event) => {
      return sum + (event.end - event.start) / (1000 * 60);
    }, 0);
  }

  return Math.max(0, totalMinutes - scheduledMinutes);
}

/**
 * Detect schedule risks
 */
export function detectScheduleRisks(
  events: LocalEvent[],
  tasks: Task[],
  workingHoursStart: number,
  workingHoursEnd: number,
  overbookedThreshold: number = 0.85 // 85% of working hours
): ScheduleRisk[] {
  const risks: ScheduleRisk[] = [];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  // Get today's events
  const todayEvents = events
    .filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === todayDate.toDateString() && !e.all_day;
    })
    .map(e => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const totalWorkingMinutes = workingHoursEnd - workingHoursStart;
  const dayStart = new Date(todayDate);
  dayStart.setHours(Math.floor(workingHoursStart / 60), workingHoursStart % 60, 0, 0);
  const dayEnd = new Date(todayDate);
  dayEnd.setHours(Math.floor(workingHoursEnd / 60), workingHoursEnd % 60, 0, 0);

  // Calculate scheduled minutes
  let scheduledMinutes = 0;
  if (todayEvents.length > 0) {
    const merged: Array<{ start: number; end: number }> = [{
      start: Math.max(todayEvents[0].start.getTime(), dayStart.getTime()),
      end: Math.min(todayEvents[0].end.getTime(), dayEnd.getTime()),
    }];
    
    for (let i = 1; i < todayEvents.length; i++) {
      const current = todayEvents[i];
      const last = merged[merged.length - 1];
      const currentStart = Math.max(current.start.getTime(), dayStart.getTime());
      const currentEnd = Math.min(current.end.getTime(), dayEnd.getTime());
      
      if (currentStart <= last.end) {
        last.end = Math.max(last.end, currentEnd);
      } else {
        merged.push({ start: currentStart, end: currentEnd });
      }
    }
    
    scheduledMinutes = merged.reduce((sum, event) => {
      return sum + (event.end - event.start) / (1000 * 60);
    }, 0);
  }

  // 1. Overbooked detector
  if (totalWorkingMinutes > 0 && scheduledMinutes / totalWorkingMinutes > overbookedThreshold) {
    risks.push({
      type: 'overbooked',
      headline: 'Overbooked Day',
      description: `You've scheduled ${Math.round((scheduledMinutes / totalWorkingMinutes) * 100)}% of your working hours today.`,
      severity: scheduledMinutes / totalWorkingMinutes > 0.95 ? 'high' : 'medium',
      affectedEvents: todayEvents.map(e => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
      })),
    });
  }

  // 2. Back-to-back detector
  if (todayEvents.length >= 3) {
    let backToBackCount = 0;
    const backToBackEvents: LocalEvent[] = [];
    
    for (let i = 0; i < todayEvents.length - 1; i++) {
      const gap = (todayEvents[i + 1].start.getTime() - todayEvents[i].end.getTime()) / (1000 * 60);
      if (gap < 10 && gap >= 0) {
        backToBackCount++;
        if (!backToBackEvents.find(e => e.id === todayEvents[i].id)) {
          backToBackEvents.push({
            ...todayEvents[i],
            start: todayEvents[i].start.toISOString(),
            end: todayEvents[i].end.toISOString(),
          });
        }
        if (!backToBackEvents.find(e => e.id === todayEvents[i + 1].id)) {
          backToBackEvents.push({
            ...todayEvents[i + 1],
            start: todayEvents[i + 1].start.toISOString(),
            end: todayEvents[i + 1].end.toISOString(),
          });
        }
      }
    }
    
    if (backToBackCount >= 2) {
      risks.push({
        type: 'back_to_back',
        headline: 'Back-to-Back Events',
        description: `You have ${backToBackCount} events with less than 10 minutes between them.`,
        severity: backToBackCount >= 4 ? 'high' : 'medium',
        affectedEvents: backToBackEvents,
      });
    }
  }

  // 3. No-break detector
  if (todayEvents.length >= 2) {
    let maxGap = 0;
    
    for (let i = 0; i < todayEvents.length - 1; i++) {
      const gap = (todayEvents[i + 1].start.getTime() - todayEvents[i].end.getTime()) / (1000 * 60);
      if (gap > maxGap) {
        maxGap = gap;
      }
    }
    
    // Check gap from start of day
    if (todayEvents.length > 0) {
      const firstGap = (todayEvents[0].start.getTime() - dayStart.getTime()) / (1000 * 60);
      if (firstGap > maxGap) {
        maxGap = firstGap;
      }
    }
    
    // Check gap to end of day
    if (todayEvents.length > 0) {
      const lastGap = (dayEnd.getTime() - todayEvents[todayEvents.length - 1].end.getTime()) / (1000 * 60);
      if (lastGap > maxGap) {
        maxGap = lastGap;
      }
    }
    
    if (maxGap < 30 && scheduledMinutes > 240) { // Less than 30 min break, more than 4 hours scheduled
      risks.push({
        type: 'no_break',
        headline: 'No Breaks Scheduled',
        description: 'You have no gaps longer than 30 minutes in your schedule today.',
        severity: scheduledMinutes > 360 ? 'high' : 'medium',
        affectedEvents: todayEvents.map(e => ({
          ...e,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
        })),
      });
    }
  }

  // 4. Overlap detector
  const overlaps: LocalEvent[] = [];
  for (let i = 0; i < todayEvents.length; i++) {
    for (let j = i + 1; j < todayEvents.length; j++) {
      if (
        todayEvents[i].start < todayEvents[j].end &&
        todayEvents[i].end > todayEvents[j].start
      ) {
        if (!overlaps.find(e => e.id === todayEvents[i].id)) {
          overlaps.push({
            ...todayEvents[i],
            start: todayEvents[i].start.toISOString(),
            end: todayEvents[i].end.toISOString(),
          });
        }
        if (!overlaps.find(e => e.id === todayEvents[j].id)) {
          overlaps.push({
            ...todayEvents[j],
            start: todayEvents[j].start.toISOString(),
            end: todayEvents[j].end.toISOString(),
          });
        }
      }
    }
  }
  
  if (overlaps.length > 0) {
    risks.push({
      type: 'overlap',
      headline: 'Overlapping Events',
      description: `You have ${overlaps.length} overlapping event${overlaps.length > 1 ? 's' : ''} today.`,
      severity: 'high',
      affectedEvents: overlaps,
    });
  }

  // 5. Task risk detector
  const todayString = todayDate.toISOString().split('T')[0];
  const overdueTasks = tasks.filter(
    task => task.due_date && 
    task.due_date.split('T')[0] < todayString && 
    task.status !== 'completed'
  );
  
  if (overdueTasks.length > 0) {
    const freeTime = calculateFreeTime(events, workingHoursStart, workingHoursEnd);
    const totalTaskDuration = overdueTasks.reduce((sum, task) => sum + (task.duration || 60), 0);
    
    if (freeTime < totalTaskDuration) {
      risks.push({
        type: 'task_risk',
        headline: 'Overdue Tasks',
        description: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} but only ${Math.round(freeTime)} minutes free today.`,
        severity: 'high',
        affectedTasks: overdueTasks,
      });
    }
  }

  return risks;
}

/**
 * Score a time slot for task placement
 */
export function scoreTimeSlot(
  slotStart: Date,
  slotEnd: Date,
  events: LocalEvent[],
  task: Task,
  workingHoursStart: number,
  workingHoursEnd: number
): number {
  let score = 100;
  const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
  
  // Prefer earlier slots for overdue or due-today tasks
  const today = new Date().toISOString().split('T')[0];
  if (task.due_date) {
    const dueDate = task.due_date.split('T')[0];
    if (dueDate < today) {
      // Overdue: prefer very early slots
      score += 50 - (slotStartMinutes / 10);
    } else if (dueDate === today) {
      // Due today: prefer morning slots
      score += 30 - (slotStartMinutes / 20);
    }
  }
  
  // Prefer slots within working hours
  if (slotStartMinutes >= workingHoursStart && slotEndMinutes <= workingHoursEnd) {
    score += 20;
  }
  
  // Check for nearby events (prefer slots with buffers)
  const nearbyEvents = events.filter(e => {
    if (e.all_day) return false;
    const eventStart = new Date(e.start);
    const eventEnd = new Date(e.end);
    const gapBefore = (slotStart.getTime() - eventEnd.getTime()) / (1000 * 60);
    const gapAfter = (eventStart.getTime() - slotEnd.getTime()) / (1000 * 60);
    return (gapBefore >= 0 && gapBefore < 15) || (gapAfter >= 0 && gapAfter < 15);
  });
  
  if (nearbyEvents.length === 0) {
    score += 15; // Prefer slots with buffers
  } else {
    score -= nearbyEvents.length * 5; // Penalize tight back-to-backs
  }
  
  return score;
}

/**
 * Find best available slots for a task
 */
export function findBestSlots(
  task: Task,
  events: LocalEvent[],
  workingHoursStart: number,
  workingHoursEnd: number,
  maxSlots: number = 3
): Array<{ start: Date; end: Date; score: number }> {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const dayStart = new Date(todayDate);
  dayStart.setHours(Math.floor(workingHoursStart / 60), workingHoursStart % 60, 0, 0);
  const dayEnd = new Date(todayDate);
  dayEnd.setHours(Math.floor(workingHoursEnd / 60), workingHoursEnd % 60, 0, 0);
  
  const duration = task.duration || 60; // Default 60 minutes
  const slots: Array<{ start: Date; end: Date; score: number }> = [];
  
  // Get today's events sorted by start time
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
  
  // Find gaps between events
  const gaps: Array<{ start: Date; end: Date }> = [];
  
  // Gap before first event
  if (todayEvents.length > 0 && todayEvents[0].start > dayStart) {
    gaps.push({
      start: dayStart,
      end: todayEvents[0].start,
    });
  }
  
  // Gaps between events
  for (let i = 0; i < todayEvents.length - 1; i++) {
    if (todayEvents[i + 1].start > todayEvents[i].end) {
      gaps.push({
        start: todayEvents[i].end,
        end: todayEvents[i + 1].start,
      });
    }
  }
  
  // Gap after last event
  if (todayEvents.length > 0 && todayEvents[todayEvents.length - 1].end < dayEnd) {
    gaps.push({
      start: todayEvents[todayEvents.length - 1].end,
      end: dayEnd,
    });
  }
  
  // If no events, the whole day is available
  if (todayEvents.length === 0 && dayEnd > dayStart) {
    gaps.push({ start: dayStart, end: dayEnd });
  }
  
  // Find slots that fit the task duration
  for (const gap of gaps) {
    const gapMinutes = (gap.end.getTime() - gap.start.getTime()) / (1000 * 60);
    if (gapMinutes >= duration) {
      // Try multiple positions within the gap
      const step = 15; // 15-minute increments
      for (let offset = 0; offset <= gapMinutes - duration; offset += step) {
        const slotStart = new Date(gap.start.getTime() + offset * 60 * 1000);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        const score = scoreTimeSlot(slotStart, slotEnd, events, task, workingHoursStart, workingHoursEnd);
        slots.push({ start: slotStart, end: slotEnd, score });
      }
    }
  }
  
  // Sort by score and return top slots
  return slots
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSlots);
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format duration in minutes to human-readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
