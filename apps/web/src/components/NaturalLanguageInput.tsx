import { useState } from 'react';
import { Button, Card, Input } from '@daypilot/ui';
import { parseEventCommand, useCalendars, useCreateEvent } from '@daypilot/lib';

export function NaturalLanguageInput() {
  const { data: calendars = [] } = useCalendars();
  const createEvent = useCreateEvent();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleParse = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    setResult('');

    try {
      const parsed = parseEventCommand(input);

      if (!parsed) {
        setResult('Could not parse command. Try: "Lunch with John tomorrow at 1pm" or "Gym M/W/F at 6am"');
        setIsProcessing(false);
        return;
      }

      const defaultCalendarId =
        calendars.find((c) => c.is_default)?.id || calendars[0]?.id;

      if (!defaultCalendarId) {
        setResult('No calendar available');
        setIsProcessing(false);
        return;
      }

      // Calculate dates
      const now = new Date();
      let startDate = new Date(now);
      let endDate = new Date(now);

      // Handle date parsing
      if (parsed.date) {
        startDate = parsed.date;
      } else if (input.toLowerCase().includes('tomorrow')) {
        startDate.setDate(startDate.getDate() + 1);
      }

      // Handle time parsing
      if (parsed.time) {
        const [time, period] = parsed.time.split(' ');
        const [hours, minutes = '0'] = time.split(':');
        let hour = parseInt(hours);
        if (period?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
        if (period?.toLowerCase() === 'am' && hour === 12) hour = 0;
        startDate.setHours(hour, parseInt(minutes), 0, 0);
      } else {
        startDate.setHours(12, 0, 0, 0); // Default to noon
      }

      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration

      // Handle recurring events
      let recurrenceRule = null;
      if (parsed.recurrence) {
        if (input.toLowerCase().includes('m/w/f')) {
          // Monday, Wednesday, Friday
          recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
        } else if (input.toLowerCase().includes('daily')) {
          recurrenceRule = 'FREQ=DAILY';
        } else if (input.toLowerCase().includes('weekly')) {
          recurrenceRule = 'FREQ=WEEKLY';
        }
      }

      const eventData = {
        title: parsed.title,
        description: `Created from: "${input}"`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        calendar_id: defaultCalendarId,
        status: 'scheduled' as const,
        recurrence_rule: recurrenceRule,
      };

      await createEvent.mutateAsync(eventData);
      setResult(`✅ Created: ${parsed.title} on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`);
      setInput('');
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Natural Language Input</h2>
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-2">
          Try: "Lunch with John tomorrow at 1pm" or "Gym M/W/F at 6am"
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleParse()}
            placeholder='e.g., "Team meeting tomorrow at 2pm"'
            className="flex-1"
            disabled={isProcessing}
          />
          <Button onClick={handleParse} disabled={isProcessing || !input.trim()}>
            {isProcessing ? 'Processing...' : 'Create'}
          </Button>
        </div>
        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.startsWith('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </Card>
  );
}

