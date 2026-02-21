import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabaseClient, getUserTimezone } from '@daypilot/lib';
import { useCalendars } from '@daypilot/lib';
import { Card, Button, Input, Label, Badge } from '@daypilot/ui';
import { CalendarManager } from '../../components/CalendarManager';
import { ShareSettings } from '../../components/ShareSettings';
import { EmailPreferences } from '../../components/EmailPreferences';
import type { User } from '@supabase/supabase-js';

export function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [use24Hour, setUse24Hour] = useState(false);
  const { data: calendars = [] } = useCalendars();
  const [defaultCalendarId, setDefaultCalendarId] = useState('');
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [timezoneFrozen, setTimezoneFrozen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUser(user);
      if (user?.user_metadata?.name) {
        setName(user.user_metadata.name);
      }
    };

    getUser();

    const defaultCalendar = calendars.find(c => c.is_default);
    if (defaultCalendar) {
      setDefaultCalendarId(defaultCalendar.id);
    }

    // Load timezone settings from profile
    const loadTimezone = async () => {
      if (user) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('timezone, timezone_frozen')
          .eq('id', user.id)
          .single();
        if (data) {
          setTimezone(data.timezone || getUserTimezone());
          setTimezoneFrozen(data.timezone_frozen || false);
        }
      }
    };
    loadTimezone();
  }, [calendars, user]);

  const handleUpdateName = async () => {
    if (!user) return;

    try {
      const { error } = await supabaseClient.auth.updateUser({
        data: { name },
      });

      if (error) throw error;
      alert('Name updated successfully');
    } catch (error: any) {
      alert('Error updating name: ' + error.message);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Account Settings */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="name">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleUpdateName}>Update</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Time Format</Label>
                <p className="text-sm text-gray-600">
                  Choose between 12-hour and 24-hour time format
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={use24Hour}
                  onChange={e => setUse24Hour(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    use24Hour ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      use24Hour ? 'translate-x-6' : ''
                    }`}
                  />
                </div>
                <span className="ml-3 text-sm">
                  {use24Hour ? '24-hour' : '12-hour'}
                </span>
              </label>
            </div>
            <div>
              <Label htmlFor="default-calendar">Default Calendar</Label>
              <select
                id="default-calendar"
                value={defaultCalendarId}
                onChange={e => setDefaultCalendarId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {calendars.map(calendar => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <div className="space-y-2">
                <select
                  id="timezone"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  disabled={timezoneFrozen}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                >
                  {(
                    (Intl as any).supportedValuesOf('timeZone') as string[]
                  ).map((tz: string) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timezoneFrozen}
                    onChange={async e => {
                      setTimezoneFrozen(e.target.checked);
                      if (user) {
                        await supabaseClient
                          .from('profiles')
                          .update({ timezone_frozen: e.target.checked })
                          .eq('id', user.id);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm">
                    Freeze timezone (Travel mode) - Keep events in this timezone
                    even when traveling
                  </span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (user) {
                      await supabaseClient
                        .from('profiles')
                        .update({ timezone: timezone })
                        .eq('id', user.id);
                      alert('Timezone updated');
                    }
                  }}
                >
                  Save Timezone
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Calendar Management */}
        <Card>
          <CalendarManager />
        </Card>

        {/* Calendar Sharing */}
        <ShareSettings />

        {/* Email Preferences */}
        <EmailPreferences />

        {/* Calendar Connections - Premium Feature */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Connect Calendars</h2>
              <p className="text-[#4f4f4f] mb-2">
                Connect your external calendars to sync events automatically.
              </p>
              <p className="text-sm text-[#4FB3B3] font-medium">
                ✨ Premium Feature - Available with Pro, Team, or Enterprise
                plans
              </p>
            </div>
            <Badge variant="success" className="ml-4">
              Premium
            </Badge>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" disabled>
              Connect Google Calendar
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Connect Outlook
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Connect Apple Calendar
            </Button>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-br from-[#EFBF4D]/10 to-[#4FB3B3]/10 rounded-lg border border-[#4FB3B3]/20">
            <p className="text-sm text-[#2B3448] font-medium mb-2">
              Upgrade to unlock calendar connections
            </p>
            <p className="text-xs text-[#4f4f4f] mb-3">
              Sync events from Google Calendar, Outlook, Apple Calendar, and
              more. Keep all your calendars in one place.
            </p>
            <Link to="/pricing">
              <Button size="sm">View Plans</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
