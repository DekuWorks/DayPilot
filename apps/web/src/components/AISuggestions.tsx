import { useState, useEffect } from 'react';
import { Card, Badge } from '@daypilot/ui';
import { useEvents } from '@daypilot/lib';
import type { Event } from '@daypilot/types';

interface AISuggestion {
  type: 'best_time' | 'focus_block' | 'break' | 'rearrange' | 'wrap_up';
  title: string;
  description: string;
  action?: () => void;
}

export function AISuggestions() {
  const { data: events = [] } = useEvents();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  useEffect(() => {
    generateSuggestions();
  }, [events]);

  const generateSuggestions = () => {
    const newSuggestions: AISuggestion[] = [];
    const now = new Date();
    const todayEvents = events.filter((e) => {
      const start = new Date(e.start);
      return (
        start.toDateString() === now.toDateString() &&
        start >= now
      );
    });

    // Check for overloaded day
    if (todayEvents.length > 6) {
      newSuggestions.push({
        type: 'rearrange',
        title: 'Heavy schedule today',
        description: `You have ${todayEvents.length} events scheduled. Consider moving some to tomorrow.`,
      });
    }

    // Check for long meeting blocks
    const longBlocks = todayEvents.filter((e) => {
      const duration =
        (new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60);
      return duration > 120; // 2 hours
    });

    if (longBlocks.length > 0) {
      newSuggestions.push({
        type: 'break',
        title: 'Add breaks between long meetings',
        description: 'Consider adding 15-minute breaks after long sessions to maintain focus.',
      });
    }

    // Check for focus time
    const hasFocusTime = todayEvents.some((e) =>
      e.title.toLowerCase().includes('focus') ||
      e.title.toLowerCase().includes('deep work')
    );

    if (!hasFocusTime && todayEvents.length > 3) {
      newSuggestions.push({
        type: 'focus_block',
        title: 'Add focus time',
        description: 'Consider blocking 2-3 hours for deep work today.',
      });
    }

    // Check for end of day
    const lastEvent = todayEvents
      .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime())
      .pop();

    if (lastEvent) {
      const lastEventEnd = new Date(lastEvent.end);
      if (lastEventEnd.getHours() >= 18) {
        newSuggestions.push({
          type: 'wrap_up',
          title: 'Plan your wrap-up',
          description: 'Your day ends late. Consider scheduling time to review and plan tomorrow.',
        });
      }
    }

    // Find best time for new tasks
    const gaps = findTimeGaps(todayEvents, now);
    if (gaps.length > 0 && gaps[0].duration >= 60) {
      newSuggestions.push({
        type: 'best_time',
        title: 'Good time for new tasks',
        description: `You have a ${Math.floor(gaps[0].duration / 60)}-hour gap starting at ${gaps[0].start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
      });
    }

    setSuggestions(newSuggestions.slice(0, 5)); // Limit to 5 suggestions
  };

  const findTimeGaps = (
    events: Event[],
    startTime: Date
  ): Array<{ start: Date; end: Date; duration: number }> => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const gaps: Array<{ start: Date; end: Date; duration: number }> = [];
    let current = new Date(startTime);
    current.setHours(9, 0, 0, 0); // Start of work day

    sorted.forEach((event) => {
      const eventStart = new Date(event.start);
      if (eventStart > current) {
        const duration = (eventStart.getTime() - current.getTime()) / (1000 * 60);
        if (duration >= 30) {
          gaps.push({
            start: new Date(current),
            end: eventStart,
            duration,
          });
        }
      }
      current = new Date(event.end);
    });

    // Check gap until end of day
    const endOfDay = new Date(current);
    endOfDay.setHours(18, 0, 0, 0);
    if (endOfDay > current) {
      const duration = (endOfDay.getTime() - current.getTime()) / (1000 * 60);
      if (duration >= 30) {
        gaps.push({
          start: new Date(current),
          end: endOfDay,
          duration,
        });
      }
    }

    return gaps.sort((a, b) => b.duration - a.duration);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">AI Suggestions</h2>
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={
                      suggestion.type === 'rearrange'
                        ? 'warning'
                        : suggestion.type === 'break'
                          ? 'error'
                          : 'default'
                    }
                  >
                    {suggestion.type.replace('_', ' ')}
                  </Badge>
                  <h3 className="font-medium">{suggestion.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{suggestion.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}




