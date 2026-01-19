import { useState, useEffect } from 'react';
import { Label, Input, Button } from '@daypilot/ui';
import { supabaseClient } from '@daypilot/lib';
import type { EventReminder } from '@daypilot/types';

interface ReminderEditorProps {
  eventId: string;
  onRemindersChange?: () => void;
}

export function ReminderEditor({ eventId, onRemindersChange }: ReminderEditorProps) {
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReminder, setNewReminder] = useState({
    reminder_type: 'default' as EventReminder['reminder_type'],
    minutes_before: 15,
  });

  useEffect(() => {
    loadReminders();
  }, [eventId]);

  const loadReminders = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('event_reminders')
        .select('*')
        .eq('event_id', eventId)
        .order('minutes_before', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReminder = async () => {
    try {
      const { error } = await supabaseClient.from('event_reminders').insert({
        event_id: eventId,
        reminder_type: newReminder.reminder_type,
        minutes_before: newReminder.minutes_before,
      });

      if (error) throw error;
      await loadReminders();
      onRemindersChange?.();
      setNewReminder({ reminder_type: 'default', minutes_before: 15 });
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabaseClient
        .from('event_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      await loadReminders();
      onRemindersChange?.();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const formatReminderTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} before`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} before`;
    }
    return `${hours}h ${mins}m before`;
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading reminders...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="font-semibold">Reminders</Label>
        {reminders.length === 0 && (
          <p className="text-sm text-gray-500 mt-1">No reminders set</p>
        )}
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded mt-2"
          >
            <div>
              <span className="text-sm font-medium capitalize">
                {reminder.reminder_type}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {formatReminderTime(reminder.minutes_before)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteReminder(reminder.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <Label>Add Reminder</Label>
        <div className="flex gap-2">
          <select
            value={newReminder.reminder_type}
            onChange={(e) =>
              setNewReminder({
                ...newReminder,
                reminder_type: e.target.value as EventReminder['reminder_type'],
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="default">Default (In-app)</option>
            <option value="email">Email</option>
            <option value="push">Push Notification</option>
            <option value="web">Web Notification</option>
            <option value="custom">Custom</option>
          </select>
          <Input
            type="number"
            min="0"
            value={newReminder.minutes_before}
            onChange={(e) =>
              setNewReminder({
                ...newReminder,
                minutes_before: parseInt(e.target.value) || 0,
              })
            }
            placeholder="Minutes"
            className="w-24"
          />
          <Button size="sm" onClick={handleAddReminder}>
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Common: 5, 15, 30 minutes or 1, 2, 24 hours before
        </p>
      </div>
    </div>
  );
}





