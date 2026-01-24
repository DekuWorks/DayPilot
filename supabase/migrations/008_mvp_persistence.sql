-- MVP Persistence Migration
-- Adds tables for events, tasks, attendees, share_links, categories, and preferences
-- with proper RLS policies

-- ============================================
-- EVENTS TABLE (Enhanced)
-- ============================================
-- Note: events table already exists, but we'll add missing columns if needed
DO $$ 
BEGIN
  -- Add user_id if it doesn't exist (for direct user ownership)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE events ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'location'
  ) THEN
    ALTER TABLE events ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'all_day'
  ) THEN
    ALTER TABLE events ADD COLUMN all_day BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE events ADD COLUMN category_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'recurrence_rule'
  ) THEN
    ALTER TABLE events ADD COLUMN recurrence_rule JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE events ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'parent_event_id'
  ) THEN
    ALTER TABLE events ADD COLUMN parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'color'
  ) THEN
    ALTER TABLE events ADD COLUMN color TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'icon'
  ) THEN
    ALTER TABLE events ADD COLUMN icon TEXT;
  END IF;
END $$;

-- Update events to use start_time and end_time for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'start'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE events RENAME COLUMN start TO start_time;
    ALTER TABLE events RENAME COLUMN "end" TO end_time;
  END IF;
END $$;

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  duration_minutes INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  category_id UUID,
  scheduled_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#059669',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================
-- ATTENDEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee')),
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('going', 'maybe', 'declined', 'pending')),
  invite_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, email)
);

-- ============================================
-- SHARE_LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'busyOnly' CHECK (mode IN ('readOnly', 'busyOnly')),
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email_reminders_enabled BOOLEAN DEFAULT TRUE,
  default_reminder_minutes INTEGER DEFAULT 30,
  working_hours JSONB DEFAULT '{"start": 480, "end": 1020}'::jsonb, -- 8 AM to 5 PM in minutes
  timezone TEXT DEFAULT 'UTC',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REMINDERS TABLE (for scheduled email reminders)
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL DEFAULT 'reminder' CHECK (type IN ('reminder', 'invite', 'rsvp_update', 'booking')),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_email TEXT NOT NULL,
  email_subject TEXT,
  email_body_html TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_invite_token ON attendees(invite_token);
CREATE INDEX IF NOT EXISTS idx_share_links_user_id ON share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_reminders_send_at ON reminders(send_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Events RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
      AND calendars.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own events" ON events;
CREATE POLICY "Users can create own events"
  ON events FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own events" ON events;
CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (user_id = auth.uid());

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Attendees RLS
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

-- Organizers can manage attendees
CREATE POLICY "Organizers can manage attendees"
  ON attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = attendees.event_id
      AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = attendees.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Public read by invite token (for RSVP page)
CREATE POLICY "Public can read by invite token"
  ON attendees FOR SELECT
  USING (true); -- Will be filtered by application logic using invite_token

-- Share Links RLS
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own share links"
  ON share_links FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public read by token (for public share page)
CREATE POLICY "Public can read active share links by token"
  ON share_links FOR SELECT
  USING (revoked_at IS NULL);

-- Preferences RLS
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reminders RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at
  BEFORE UPDATE ON attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
