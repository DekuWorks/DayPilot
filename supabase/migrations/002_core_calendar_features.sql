-- Core Calendar Foundation Features
-- Add columns for enhanced event features

-- Add all-day event support
ALTER TABLE events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT FALSE;

-- Add event color and icon
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add recurring event support
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT; -- RRULE format
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT FALSE;

-- Add calendar visibility toggle
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Add timezone support
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT; -- Store event timezone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT; -- User's default timezone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone_frozen BOOLEAN DEFAULT FALSE; -- Travel mode

-- Add notification/reminder support
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'default' CHECK (reminder_type IN ('default', 'custom', 'email', 'push', 'web')),
  minutes_before INTEGER NOT NULL DEFAULT 15,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for event_reminders
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event reminders"
  ON event_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN calendars ON calendars.id = events.calendar_id
      WHERE events.id = event_reminders.event_id
      AND calendars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own event reminders"
  ON event_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN calendars ON calendars.id = events.calendar_id
      WHERE events.id = event_reminders.event_id
      AND calendars.owner_id = auth.uid()
    )
  );

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);





