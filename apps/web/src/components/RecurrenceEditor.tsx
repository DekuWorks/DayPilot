import { useState, useEffect } from 'react';
import { Label, Input } from '@daypilot/ui';
import { RRule } from 'rrule';

interface RecurrenceEditorProps {
  recurrenceRule: string | null;
  recurrenceEndDate: string | null;
  onRecurrenceChange: (rule: string | null, endDate: string | null) => void;
}

export function RecurrenceEditor({
  recurrenceRule,
  recurrenceEndDate,
  onRecurrenceChange,
}: RecurrenceEditorProps) {
  // Parse existing rule if provided
  const parseExistingRule = () => {
    if (!recurrenceRule) {
      return {
        isRecurring: false,
        frequency: 'daily' as const,
        interval: 1,
        endType: 'never' as const,
        occurrences: 10,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString().slice(0, 10) : '',
      };
    }

    try {
      const rule = RRule.fromString(recurrenceRule);
      const freqMap: Record<number, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
        [RRule.DAILY]: 'daily',
        [RRule.WEEKLY]: 'weekly',
        [RRule.MONTHLY]: 'monthly',
        [RRule.YEARLY]: 'yearly',
      };

      return {
        isRecurring: true,
        frequency: freqMap[rule.options.freq || RRule.DAILY] || 'daily',
        interval: rule.options.interval || 1,
        endType: rule.options.count
          ? ('after' as const)
          : rule.options.until
            ? ('on' as const)
            : ('never' as const),
        occurrences: rule.options.count || 10,
        endDate: recurrenceEndDate
          ? new Date(recurrenceEndDate).toISOString().slice(0, 10)
          : '',
      };
    } catch {
      return {
        isRecurring: true,
        frequency: 'daily' as const,
        interval: 1,
        endType: 'never' as const,
        occurrences: 10,
        endDate: '',
      };
    }
  };

  const parsed = parseExistingRule();
  const [isRecurring, setIsRecurring] = useState(parsed.isRecurring);
  const [frequency, setFrequency] = useState(parsed.frequency);
  const [interval, setInterval] = useState(parsed.interval);
  const [endType, setEndType] = useState(parsed.endType);
  const [occurrences, setOccurrences] = useState(parsed.occurrences);
  const [endDate, setEndDate] = useState(parsed.endDate);

  // Update when props change
  useEffect(() => {
    const newParsed = parseExistingRule();
    setIsRecurring(newParsed.isRecurring);
    setFrequency(newParsed.frequency);
    setInterval(newParsed.interval);
    setEndType(newParsed.endType);
    setOccurrences(newParsed.occurrences);
    setEndDate(newParsed.endDate);
  }, [recurrenceRule, recurrenceEndDate]);

  const handleToggle = (enabled: boolean) => {
    setIsRecurring(enabled);
    if (!enabled) {
      onRecurrenceChange(null, null);
    } else {
      generateRule();
    }
  };

  const generateRule = () => {
    if (!isRecurring) return;

    const freqMap = {
      daily: RRule.DAILY,
      weekly: RRule.WEEKLY,
      monthly: RRule.MONTHLY,
      yearly: RRule.YEARLY,
    };

    const options: {
      freq: number;
      interval: number;
      count?: number;
      until?: Date;
    } = {
      freq: freqMap[frequency],
      interval: interval,
    };

    if (endType === 'after') {
      options.count = occurrences;
    } else if (endType === 'on' && endDate) {
      options.until = new Date(endDate);
    }

    const rule = new RRule(options);
    const ruleString = rule.toString();

    const finalEndDate = endType === 'on' && endDate ? new Date(endDate).toISOString() : null;

    onRecurrenceChange(ruleString, finalEndDate);
  };

  // Update rule when any setting changes
  const updateRule = () => {
    if (isRecurring) {
      generateRule();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recurring"
          checked={isRecurring}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-4 h-4"
        />
        <Label htmlFor="recurring" className="mb-0 font-semibold">
          Recurring event
        </Label>
      </div>

      {isRecurring && (
        <div className="pl-6 space-y-4 border-l-2 border-gray-200">
          <div>
            <Label htmlFor="frequency">Repeat</Label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value as any);
                updateRule();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <Label htmlFor="interval">Repeat every</Label>
            <div className="flex items-center gap-2">
              <Input
                id="interval"
                type="number"
                min="1"
                value={interval}
                onChange={(e) => {
                  setInterval(parseInt(e.target.value) || 1);
                  updateRule();
                }}
                className="w-20"
              />
              <span className="text-sm text-gray-600">
                {frequency === 'daily' && 'day(s)'}
                {frequency === 'weekly' && 'week(s)'}
                {frequency === 'monthly' && 'month(s)'}
                {frequency === 'yearly' && 'year(s)'}
              </span>
            </div>
          </div>

          <div>
            <Label>Ends</Label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={endType === 'never'}
                  onChange={(e) => {
                    setEndType(e.target.value as any);
                    updateRule();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Never</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="after"
                  checked={endType === 'after'}
                  onChange={(e) => {
                    setEndType(e.target.value as any);
                    updateRule();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">After</span>
                <Input
                  type="number"
                  min="1"
                  value={occurrences}
                  onChange={(e) => {
                    setOccurrences(parseInt(e.target.value) || 1);
                    updateRule();
                  }}
                  className="w-20 ml-2"
                  disabled={endType !== 'after'}
                />
                <span className="text-sm ml-2">occurrences</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="on"
                  checked={endType === 'on'}
                  onChange={(e) => {
                    setEndType(e.target.value as any);
                    updateRule();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">On</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    updateRule();
                  }}
                  className="ml-2"
                  disabled={endType !== 'on'}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

