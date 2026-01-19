import { useState, useEffect } from 'react';
import { Button, Input, Label, Card } from '@daypilot/ui';
import {
  useAvailabilityRules,
} from '@daypilot/lib';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@daypilot/lib';
import type { AvailabilityRule } from '@daypilot/types';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface AvailabilityEditorProps {
  bookingLinkId: string;
}

export function AvailabilityEditor({ bookingLinkId }: AvailabilityEditorProps) {
  const { data: availabilityRules = [] } = useAvailabilityRules(bookingLinkId);
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRules(availabilityRules);
  }, [availabilityRules]);

  const updateRule = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time' | 'is_available',
    value: string | boolean
  ) => {
    setRules((prevRules) => {
      const existingRuleIndex = prevRules.findIndex(
        (rule) => rule.day_of_week === dayOfWeek
      );

      if (existingRuleIndex >= 0) {
        const updatedRules = [...prevRules];
        updatedRules[existingRuleIndex] = {
          ...updatedRules[existingRuleIndex],
          [field]: value,
        };
        return updatedRules;
      } else {
        return [
          ...prevRules,
          {
            id: `temp-${dayOfWeek}`,
            booking_link_id: bookingLinkId,
            day_of_week: dayOfWeek,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: true,
            created_at: new Date().toISOString(),
            [field]: value,
          } as AvailabilityRule,
        ];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing rules
      await supabaseClient
        .from('availability_rules')
        .delete()
        .eq('booking_link_id', bookingLinkId);

      // Insert new rules (only available ones)
      const rulesToSave = rules.filter((rule) => rule.is_available);
      if (rulesToSave.length > 0) {
        await supabaseClient
          .from('availability_rules')
          .insert(
            rulesToSave.map((rule) => ({
              booking_link_id: bookingLinkId,
              day_of_week: rule.day_of_week,
              start_time: rule.start_time,
              end_time: rule.end_time,
              is_available: true,
            }))
          );
      }

      queryClient.invalidateQueries({
        queryKey: ['availability-rules', bookingLinkId],
      });
      alert('Availability updated successfully!');
    } catch (error: any) {
      alert('Error saving availability: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getRuleForDay = (dayOfWeek: number): AvailabilityRule | null => {
    return rules.find((rule) => rule.day_of_week === dayOfWeek) || null;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Weekly Availability</h2>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Set the hours when this booking link is available each day of the week.
      </p>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const rule = getRuleForDay(day.value);
          const isAvailable = rule?.is_available ?? false;
          const startTime = rule?.start_time || '09:00:00';
          const endTime = rule?.end_time || '17:00:00';

          return (
            <div
              key={day.value}
              className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  id={`day-${day.value}`}
                  checked={isAvailable}
                  onChange={(e) =>
                    updateRule(day.value, 'is_available', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor={`day-${day.value}`} className="mb-0 font-medium">
                  {day.label}
                </Label>
              </div>

              {isAvailable ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={startTime.slice(0, 5)}
                    onChange={(e) =>
                      updateRule(day.value, 'start_time', e.target.value + ':00')
                    }
                    className="flex-1"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="time"
                    value={endTime.slice(0, 5)}
                    onChange={(e) =>
                      updateRule(day.value, 'end_time', e.target.value + ':00')
                    }
                    className="flex-1"
                  />
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Not available</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

