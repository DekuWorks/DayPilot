-- DayPilot rebrand schema gaps (ADR-001: Supabase primary)
-- Extends profiles/preferences, adds workspaces, projects, notes, focus, pilot briefs,
-- notifications, and integration credential references. Idempotent where practical.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PROFILES enhancements
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_start SMALLINT DEFAULT 0 CHECK (week_start >= 0 AND week_start <= 6);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'not_started'
  CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'skipped'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN profiles.week_start IS '0=Sunday … 6=Saturday';
COMMENT ON COLUMN profiles.onboarding_status IS 'Resumable onboarding state';

-- ============================================
-- PREFERENCES enhancements
-- ============================================
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark'
  CHECK (theme IN ('dark', 'light', 'system'));
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS default_calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS focus_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MMM d, yyyy';
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT 'h:mm a'
  CHECK (time_format IN ('h:mm a', 'HH:mm'));

-- ============================================
-- WORKSPACES
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#42E85F',
  type TEXT NOT NULL DEFAULT 'personal'
    CHECK (type IN ('personal', 'work', 'side', 'school', 'team', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'removed')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- ============================================
-- CALENDARS enhancements
-- ============================================
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'native'
  CHECK (provider IN ('native', 'google', 'outlook', 'apple', 'other'));
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle'
  CHECK (sync_status IN ('idle', 'syncing', 'error', 'disconnected'));
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Align default calendar color with new brand
ALTER TABLE calendars ALTER COLUMN color SET DEFAULT '#42E85F';

-- ============================================
-- EVENTS enhancements
-- ============================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'workspace', 'public'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- ============================================
-- TASKS enhancements + subtasks
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Backfill due_at from due_date when present
UPDATE tasks SET due_at = due_date::timestamptz WHERE due_at IS NULL AND due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  color TEXT NOT NULL DEFAULT '#A855F7',
  start_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- Add FK for tasks.project_id now that projects exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_project_id_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'markdown'
    CHECK (content_format IN ('markdown', 'plain', 'html')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(user_id, updated_at DESC);

-- ============================================
-- FOCUS SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, started_at DESC);

-- ============================================
-- PILOT BRIEFS
-- ============================================
CREATE TABLE IF NOT EXISTS pilot_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, brief_date)
);

COMMENT ON COLUMN pilot_briefs.input_snapshot IS 'Minimal structured context; avoid raw sensitive prompts';
COMMENT ON COLUMN pilot_briefs.content IS 'Validated structured brief payload returned to clients';

CREATE INDEX IF NOT EXISTS idx_pilot_briefs_user_date ON pilot_briefs(user_id, brief_date DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  resource_type TEXT,
  resource_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios', 'web', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- ============================================
-- INTEGRATION CONNECTIONS (no secrets in client-readable columns)
-- ============================================
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'zoom', 'apple', 'other')),
  provider_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'error', 'disconnected', 'expired')),
  scopes TEXT[],
  -- Reference only; actual tokens live in vault / Edge Function secrets storage
  encrypted_credentials_reference TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_user ON integration_connections(user_id);

COMMENT ON COLUMN integration_connections.encrypted_credentials_reference IS
  'Opaque reference to server-side encrypted credentials; never return secrets to clients';

-- ============================================
-- updated_at helper (reuse if present)
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'workspaces', 'projects', 'notes', 'subtasks',
    'pilot_briefs', 'integration_connections', 'calendars'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%s ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- Workspaces: owner or active member
DROP POLICY IF EXISTS "workspace_select" ON workspaces;
CREATE POLICY "workspace_select" ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "workspace_insert" ON workspaces;
CREATE POLICY "workspace_insert" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspace_update" ON workspaces;
CREATE POLICY "workspace_update" ON workspaces FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "workspace_delete" ON workspaces;
CREATE POLICY "workspace_delete" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspace_members_manage" ON workspace_members;
CREATE POLICY "workspace_members_manage" ON workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_owner" ON projects;
CREATE POLICY "projects_owner" ON projects FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "notes_owner" ON notes;
CREATE POLICY "notes_owner" ON notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "subtasks_via_task" ON subtasks;
CREATE POLICY "subtasks_via_task" ON subtasks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "focus_sessions_owner" ON focus_sessions;
CREATE POLICY "focus_sessions_owner" ON focus_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pilot_briefs_owner" ON pilot_briefs;
CREATE POLICY "pilot_briefs_owner" ON pilot_briefs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_owner" ON notifications;
CREATE POLICY "notifications_owner" ON notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_tokens_owner" ON device_tokens;
CREATE POLICY "device_tokens_owner" ON device_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clients may read non-secret connection metadata only (no credential column exposure via views later)
DROP POLICY IF EXISTS "integration_connections_owner" ON integration_connections;
CREATE POLICY "integration_connections_owner" ON integration_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Bootstrap personal workspace on profile create (extend handle_new_user if exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  SELECT id INTO ws_id FROM public.workspaces
  WHERE owner_id = NEW.id AND type = 'personal'
  ORDER BY created_at ASC LIMIT 1;

  IF ws_id IS NULL THEN
    INSERT INTO public.workspaces (owner_id, name, color, type)
    VALUES (NEW.id, 'Personal', '#F97316', 'personal')
    RETURNING id INTO ws_id;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (ws_id, NEW.id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_personal_workspace ON profiles;
CREATE TRIGGER on_profile_personal_workspace
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_personal_workspace();
