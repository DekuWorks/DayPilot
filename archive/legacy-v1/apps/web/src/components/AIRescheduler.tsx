import { useState } from 'react';
import { Card, Button } from '@daypilot/ui';
import { useEvents, useUpdateEvent } from '@daypilot/lib';
import { formatTime } from '@daypilot/lib';
import type { Event } from '@daypilot/types';

export function AIRescheduler() {
  const { data: events = [] } = useEvents();
  const updateEvent = useUpdateEvent();
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  // Find events that might need rescheduling
  const now = new Date();
  const upcomingEvents = events
    .filter(e => {
      const start = new Date(e.start);
      return start > now && start.getTime() - now.getTime() < 3600000; // Next hour
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Check for conflicts
  const conflicts: Array<{ event1: Event; event2: Event }> = [];
  for (
    let firstEventIndex = 0;
    firstEventIndex < events.length;
    firstEventIndex++
  ) {
    for (
      let secondEventIndex = firstEventIndex + 1;
      secondEventIndex < events.length;
      secondEventIndex++
    ) {
      const firstEvent = events[firstEventIndex];
      const secondEvent = events[secondEventIndex];
      const firstEventStart = new Date(firstEvent.start);
      const firstEventEnd = new Date(firstEvent.end);
      const secondEventStart = new Date(secondEvent.start);
      const secondEventEnd = new Date(secondEvent.end);

      if (
        firstEventStart < secondEventEnd &&
        firstEventEnd > secondEventStart &&
        firstEvent.calendar_id === secondEvent.calendar_id
      ) {
        conflicts.push({ event1: firstEvent, event2: secondEvent });
      }
    }
  }

  const handleAutoResolve = async (event1: Event, event2: Event) => {
    setRescheduling(event1.id);
    try {
      // Move the second event to after the first
      const event1End = new Date(event1.end);
      const duration =
        new Date(event2.end).getTime() - new Date(event2.start).getTime();

      await updateEvent.mutateAsync({
        id: event2.id,
        start: event1End.toISOString(),
        end: new Date(event1End.getTime() + duration).toISOString(),
      });
    } catch (error) {
      console.error('Error rescheduling:', error);
    } finally {
      setRescheduling(null);
    }
  };

  const handleSuggestNextSlot = async (event: Event) => {
    setRescheduling(event.id);
    try {
      // Find next available slot (simplified - just move to next hour)
      const currentStart = new Date(event.start);
      const duration = new Date(event.end).getTime() - currentStart.getTime();
      const newStart = new Date(currentStart);
      newStart.setHours(newStart.getHours() + 1, 0, 0);

      await updateEvent.mutateAsync({
        id: event.id,
        start: newStart.toISOString(),
        end: new Date(newStart.getTime() + duration).toISOString(),
      });
    } catch (error) {
      console.error('Error rescheduling:', error);
    } finally {
      setRescheduling(null);
    }
  };

  if (conflicts.length === 0 && upcomingEvents.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">AI Rescheduler</h2>
      <div className="space-y-4">
        {conflicts.length > 0 && (
          <div>
            <h3 className="font-medium mb-2 text-red-600">
              Conflicts Detected ({conflicts.length})
            </h3>
            <div className="space-y-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {conflict.event1.title} conflicts with{' '}
                        {conflict.event2.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatTime(new Date(conflict.event1.start))} -{' '}
                        {formatTime(new Date(conflict.event1.end))} vs{' '}
                        {formatTime(new Date(conflict.event2.start))} -{' '}
                        {formatTime(new Date(conflict.event2.end))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleAutoResolve(conflict.event1, conflict.event2)
                      }
                      disabled={rescheduling === conflict.event2.id}
                    >
                      {rescheduling === conflict.event2.id
                        ? 'Rescheduling...'
                        : 'Auto-resolve'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Upcoming Events</h3>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatTime(new Date(event.start))} -{' '}
                        {formatTime(new Date(event.end))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuggestNextSlot(event)}
                      disabled={rescheduling === event.id}
                    >
                      {rescheduling === event.id
                        ? 'Moving...'
                        : 'Move to next slot'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
