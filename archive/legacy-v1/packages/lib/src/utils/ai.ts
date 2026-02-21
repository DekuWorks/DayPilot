/**
 * AI Scheduling Utilities
 * These functions will be replaced with actual AI API calls later
 */

export interface AITask {
  title: string;
  description?: string;
  duration: number; // minutes
  priority: 'high' | 'medium' | 'low';
  category?: string;
  energy_level?: 'high' | 'medium' | 'low';
}

export interface AISchedule {
  tasks: Array<{
    task: AITask;
    suggestedStart: Date;
    suggestedEnd: Date;
  }>;
  conflicts: string[];
  suggestions: string[];
}

/**
 * Parse natural language input into tasks
 * TODO: Replace with actual AI/NLP service
 */
export function parseNaturalLanguage(input: string): AITask[] {
  const tasks: AITask[] = [];

  // Simple parsing - split by common delimiters
  const sentences = input
    .split(/[.,;!?]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  sentences.forEach(sentence => {
    // Extract duration if mentioned
    const durationMatch = sentence.match(/(\d+)\s*(min|minute|hour|hr|h)/i);
    const duration = durationMatch
      ? parseInt(durationMatch[1]) *
        (durationMatch[2].toLowerCase().startsWith('h') ? 60 : 1)
      : 60; // Default 1 hour

    // Extract priority keywords
    const priority = sentence.match(/urgent|important|priority/i)
      ? 'high'
      : sentence.match(/low|optional/i)
        ? 'low'
        : 'medium';

    // Extract category
    const category = sentence
      .match(/(work|personal|meeting|call|task|project)/i)?.[1]
      ?.toLowerCase();

    tasks.push({
      title: sentence,
      duration,
      priority,
      category,
      energy_level: 'medium',
    });
  });

  return tasks;
}

/**
 * Generate AI schedule suggestions
 * TODO: Replace with actual AI service
 */
export function generateAISchedule(
  tasks: AITask[],
  existingEvents: Array<{ start: Date; end: Date }>,
  startDate: Date = new Date()
): AISchedule {
  const schedule: AISchedule['tasks'] = [];
  const conflicts: string[] = [];
  const suggestions: string[] = [];

  let currentTime = new Date(startDate);
  currentTime.setHours(9, 0, 0, 0); // Start at 9 AM

  tasks
    .sort((a, b) => {
      // Sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .forEach(task => {
      // Find next available slot
      let taskStart = new Date(currentTime);
      let slotFound = false;

      // Check for conflicts - search up to 24 hours ahead
      for (let hoursAhead = 0; hoursAhead < 24; hoursAhead++) {
        const potentialStartTime = new Date(currentTime);
        potentialStartTime.setHours(potentialStartTime.getHours() + hoursAhead);
        const potentialEndTime = new Date(potentialStartTime);
        potentialEndTime.setMinutes(
          potentialEndTime.getMinutes() + task.duration
        );

        const hasConflict = existingEvents.some(event => {
          return (
            (potentialStartTime >= event.start &&
              potentialStartTime < event.end) ||
            (potentialEndTime > event.start && potentialEndTime <= event.end) ||
            (potentialStartTime <= event.start && potentialEndTime >= event.end)
          );
        });

        if (!hasConflict) {
          taskStart = potentialStartTime;
          slotFound = true;
          break;
        }
      }

      if (!slotFound) {
        conflicts.push(`Could not find slot for: ${task.title}`);
        suggestions.push(
          `Consider rescheduling existing events or breaking "${task.title}" into smaller tasks`
        );
      }

      const taskEnd = new Date(taskStart);
      taskEnd.setMinutes(taskEnd.getMinutes() + task.duration);

      schedule.push({
        task,
        suggestedStart: taskStart,
        suggestedEnd: taskEnd,
      });

      // Move current time forward
      currentTime = new Date(taskEnd);
      // Add buffer time
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    });

  // Add suggestions
  if (schedule.length > 0) {
    suggestions.push(
      'Schedule looks good! Consider adding breaks between tasks.'
    );
  }

  return { tasks: schedule, conflicts, suggestions };
}

/**
 * Parse natural language event creation
 * Examples:
 * - "Lunch w/ John tomorrow at 1" → event
 * - "Gym M/W/F at 6am" → recurring event
 * - "Finish taxes by Friday" → task with deadline
 */
export function parseEventCommand(input: string): {
  type: 'event' | 'recurring' | 'task';
  title: string;
  date?: Date;
  time?: string;
  recurrence?: string;
  deadline?: Date;
} | null {
  const lower = input.toLowerCase();

  // Check for recurring patterns
  if (
    lower.match(
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|m\/w\/f|daily|weekly|monthly)/i
    )
  ) {
    return {
      type: 'recurring',
      title: input,
      recurrence: 'weekly',
    };
  }

  // Check for time mentions
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const dateMatch = input.match(
    /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  );

  if (timeMatch || dateMatch) {
    return {
      type: 'event',
      title: input,
      date: dateMatch ? new Date() : undefined, // Simplified
      time: timeMatch
        ? `${timeMatch[1]}:${timeMatch[2] || '00'} ${timeMatch[3]}`
        : undefined,
    };
  }

  // Check for deadline
  if (lower.match(/(by|before|due)\s+(friday|monday|tomorrow|next week)/i)) {
    return {
      type: 'task',
      title: input,
      deadline: new Date(), // Simplified
    };
  }

  return {
    type: 'event',
    title: input,
  };
}
