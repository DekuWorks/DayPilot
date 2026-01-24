import { useState, useEffect } from 'react';
import { Card, Button, Input, Label } from '@daypilot/ui';
import {
  getUserEmailPreferences,
  saveUserEmailPreferences,
  isEmailEnabled,
} from '@daypilot/lib';

export function EmailPreferences() {
  const [preferences, setPreferences] = useState({
    remindersEnabled: true,
    defaultReminderMinutes: 30,
  });
  const [isSaving, setIsSaving] = useState(false);
  const emailEnabled = isEmailEnabled();

  useEffect(() => {
    const prefs = getUserEmailPreferences();
    setPreferences(prefs);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    saveUserEmailPreferences(preferences);
    setTimeout(() => {
      setIsSaving(false);
      alert('Email preferences saved');
    }, 300);
  };

  return (
    <Card className="sidebar-card p-6">
      <h3 className="text-lg font-bold text-[var(--text)] mb-4">Email Preferences</h3>
      
      {!emailEnabled && (
        <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p className="text-sm text-yellow-800">
            Email notifications are not configured. Emails will be logged but not sent.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Reminders Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold text-[var(--text)]">
              Email Reminders
            </Label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Receive email reminders before events
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.remindersEnabled}
              onChange={(e) =>
                setPreferences({ ...preferences, remindersEnabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4FB3B3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4FB3B3]"></div>
          </label>
        </div>

        {/* Default Reminder Time */}
        {preferences.remindersEnabled && (
          <div>
            <Label htmlFor="reminder-minutes" className="text-sm font-semibold text-[var(--text)] mb-2 block">
              Default Reminder Time
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reminder-minutes"
                type="number"
                min="5"
                max="1440"
                step="5"
                value={preferences.defaultReminderMinutes}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    defaultReminderMinutes: parseInt(e.target.value) || 30,
                  })
                }
                className="flex-1"
              />
              <span className="text-sm text-[var(--muted)]">minutes before</span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Events will be reminded {preferences.defaultReminderMinutes} minutes before start time
            </p>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </Card>
  );
}
