-- MVP Persistence Migration
-- Adds tables for events, tasks, attendees, share_links, categories, and preferences
-- with proper RLS policies

-- ============================================
-- BASELINE (make this migration runnable first)
-- ============================================

-- Extensions used by this migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles table (extends auth.users) — created by 001_initial_schema.sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendars table — created by 001_initial_schema.sql
CREATE TABLE IF NOT EXISTS calendars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#059669',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table — created by 001_initial_schema.sql, but we create a compatible version if missing.
-- We support BOTH legacy columns (start/"end") and new columns (start_time/end_time) and keep them in sync.
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start TIMESTAMP WITH TIME ZONE,
  "end" TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  all_day BOOLEAN DEFAULT FALSE,
  category_id UUID,
  recurrence_rule JSONB,
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep legacy and new time columns in sync
CREATE OR REPLACE FUNCTION sync_event_time_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Start
  IF NEW.start_time IS NULL AND NEW.start IS NOT NULL THEN
    NEW.start_time := NEW.start;
  ELSIF NEW.start IS NULL AND NEW.start_time IS NOT NULL THEN
    NEW.start := NEW.start_time;
  END IF;

  -- End
  IF NEW.end_time IS NULL AND NEW."end" IS NOT NULL THEN
    NEW.end_time := NEW."end";
  ELSIF NEW."end" IS NULL AND NEW.end_time IS NOT NULL THEN
    NEW."end" := NEW.end_time;
  END IF;

  -- Best-effort defaults (avoid leaving nulls when one side is present)
  IF NEW.start_time IS NULL THEN NEW.start_time := NEW.start; END IF;
  IF NEW.start IS NULL THEN NEW.start := NEW.start_time; END IF;
  IF NEW.end_time IS NULL THEN NEW.end_time := NEW."end"; END IF;
  IF NEW."end" IS NULL THEN NEW."end" := NEW.end_time; END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_event_time_columns_trigger ON events;
CREATE TRIGGER sync_event_time_columns_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_time_columns();

-- ============================================
-- EVENTS TABLE (Enhanced)
-- ============================================
-- Note: events table already exists, but we'll add missing columns if needed
DO $$ 
BEGIN
  IF to_regclass('public.events') IS NULL THEN
    RETURN;
  END IF;

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

  -- Ensure BOTH legacy and new time columns exist (we do not rename)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE events ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE events ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'start'
  ) THEN
    ALTER TABLE events ADD COLUMN start TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'end'
  ) THEN
    ALTER TABLE events ADD COLUMN "end" TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Backfill in either direction (best effort)
  UPDATE events
    SET start_time = COALESCE(start_time, start),
        start = COALESCE(start, start_time),
        end_time = COALESCE(end_time, "end"),
        "end" = COALESCE("end", end_time)
  WHERE start_time IS NULL OR start IS NULL OR end_time IS NULL OR "end" IS NULL;
END $$;

-- IMPORTANT:
-- We do NOT rename columns (start/"end") because older migrations and edge functions may depend on them.
-- Instead we keep both (start/"end" and start_time/end_time) and sync them via trigger above.

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

DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Attendees RLS
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can manage attendees" ON attendees;
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
-- Note: This is permissive; the app only queries by invite_token.
DROP POLICY IF EXISTS "Public can read by invite token" ON attendees;
CREATE POLICY "Public can read by invite token"
  ON attendees FOR SELECT
  USING (true);

-- Share Links RLS
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own share links" ON share_links;
CREATE POLICY "Users can manage own share links"
  ON share_links FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public read by token (for public share page)
DROP POLICY IF EXISTS "Public can read active share links by token" ON share_links;
CREATE POLICY "Public can read active share links by token"
  ON share_links FOR SELECT
  USING (revoked_at IS NULL);

-- Preferences RLS
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON preferences;
CREATE POLICY "Users can manage own preferences"
  ON preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reminders RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
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

-- Make trigger creation idempotent (SQL Editor reruns won't fail)
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_attendees_updated_at ON attendees;
DROP TRIGGER IF EXISTS update_share_links_updated_at ON share_links;
DROP TRIGGER IF EXISTS update_preferences_updated_at ON preferences;
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;

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