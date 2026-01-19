import { useState } from 'react';
import { Button, Card, Badge } from '@daypilot/ui';
import {
  parseNaturalLanguage,
  generateAISchedule,
  useEvents,
  useCalendars,
  useCreateEvent,
} from '@daypilot/lib';
import type { AISchedule } from '@daypilot/lib';

interface AIQuickPlanProps {
  onScheduleGenerated?: () => void;
}

export function AIQuickPlan({ onScheduleGenerated }: AIQuickPlanProps) {
  const { data: events = [] } = useEvents();
  const { data: calendars = [] } = useCalendars();
  const createEvent = useCreateEvent();
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<AISchedule | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setIsGenerating(true);
    setError('');
    setSchedule(null);

    try {
      // Parse natural language
      const tasks = parseNaturalLanguage(input);

      if (tasks.length === 0) {
        setError('Could not parse any tasks from your input. Try being more specific.');
        setIsGenerating(false);
        return;
      }

      // Get existing events for conflict detection
      const existingEvents = events.map((e) => ({
        start: new Date(e.start),
        end: new Date(e.end),
      }));

      // Generate schedule
      const generatedSchedule = generateAISchedule(tasks, existingEvents);

      setSchedule(generatedSchedule);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!schedule) return;

    const defaultCalendarId =
      calendars.find((c) => c.is_default)?.id || calendars[0]?.id;

    if (!defaultCalendarId) {
      setError('No calendar available');
      return;
    }

    try {
      for (const item of schedule.tasks) {
        await createEvent.mutateAsync({
          title: item.task.title,
          description: item.task.description || `AI-generated: ${input}`,
          start: item.suggestedStart.toISOString(),
          end: item.suggestedEnd.toISOString(),
          calendar_id: defaultCalendarId,
          status: 'scheduled',
          color: item.task.priority === 'high' ? '#dc2626' : item.task.priority === 'medium' ? '#f59e0b' : '#059669',
        });
      }

      setInput('');
      setSchedule(null);
      onScheduleGenerated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create events');
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">AI Quick Plan</h2>
      <div className="space-y-4">
        <textarea
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={4}
          placeholder="Describe what you need to do today... e.g., 'Team meeting at 2pm, finish report by 5pm, gym workout'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !input.trim()}
          className="w-full"
        >
          {isGenerating ? 'Generating schedule...' : 'Generate schedule'}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {schedule && (
          <div className="space-y-4 mt-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Suggested Schedule</h3>
              <Button size="sm" onClick={handleApplySchedule}>
                Apply to Calendar
              </Button>
            </div>

            {schedule.conflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
                <p className="font-semibold mb-1">Conflicts detected:</p>
                <ul className="list-disc list-inside">
                  {schedule.conflicts.map((conflict, i) => (
                    <li key={i}>{conflict}</li>
                  ))}
                </ul>
              </div>
            )}

            {schedule.suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
                <p className="font-semibold mb-1">Suggestions:</p>
                <ul className="list-disc list-inside">
                  {schedule.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              {schedule.tasks.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.task.title}</h4>
                      {item.task.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.task.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        item.task.priority === 'high'
                          ? 'error'
                          : item.task.priority === 'medium'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {item.task.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {item.suggestedStart.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {item.suggestedEnd.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="ml-2">
                      ({item.task.duration} min)
                    </span>
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





