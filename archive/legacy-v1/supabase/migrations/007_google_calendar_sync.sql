-- Google Calendar Connect & Sync
-- Enables OAuth connection to Google Calendar and sync functionality

-- Connected accounts table (stores OAuth tokens)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google', 'outlook', 'apple')),
  provider_account_id TEXT NOT NULL, -- Google user ID
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT, -- OAuth scopes granted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- Calendar mappings (maps Google calendars to DayPilot calendars)
CREATE TABLE IF NOT EXISTS calendar_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  daypilot_calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  provider_calendar_id TEXT NOT NULL, -- Google calendar ID
  provider_calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connected_account_id, provider_calendar_id),
  UNIQUE(daypilot_calendar_id)
);

-- Event mappings (maps Google events to DayPilot events)
CREATE TABLE IF NOT EXISTS event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_mapping_id UUID NOT NULL REFERENCES calendar_mappings(id) ON DELETE CASCADE,
  daypilot_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL, -- Google event ID
  provider_etag TEXT, -- For conflict detection
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_mapping_id, provider_event_id),
  UNIQUE(daypilot_event_id)
);

-- Sync state (tracks sync tokens and last sync times)
CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_mapping_id UUID NOT NULL REFERENCES calendar_mappings(id) ON DELETE CASCADE,
  sync_token TEXT, -- Google sync token for incremental sync
  last_sync_token TEXT, -- Previous sync token for rollback
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_mapping_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON connected_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_is_active ON connected_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_connected_account_id ON calendar_mappings(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_daypilot_calendar_id ON calendar_mappings(daypilot_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_sync_enabled ON calendar_mappings(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_event_mappings_calendar_mapping_id ON event_mappings(calendar_mapping_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_daypilot_event_id ON event_mappings(daypilot_event_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_provider_event_id ON event_mappings(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_calendar_mapping_id ON sync_state(calendar_mapping_id);

-- RLS Policies for connected_accounts
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected accounts"
  ON connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connected accounts"
  ON connected_accounts FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for calendar_mappings
ALTER TABLE calendar_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar mappings"
  ON calendar_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connected_accounts
      WHERE connected_accounts.id = calendar_mappings.connected_account_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own calendar mappings"
  ON calendar_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM connected_accounts
      WHERE connected_accounts.id = calendar_mappings.connected_account_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for event_mappings
ALTER TABLE event_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event mappings"
  ON event_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_mappings
      JOIN connected_accounts ON connected_accounts.id = calendar_mappings.connected_account_id
      WHERE calendar_mappings.id = event_mappings.calendar_mapping_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own event mappings"
  ON event_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_mappings
      JOIN connected_accounts ON connected_accounts.id = calendar_mappings.connected_account_id
      WHERE calendar_mappings.id = event_mappings.calendar_mapping_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for sync_state
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync state"
  ON sync_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_mappings
      JOIN connected_accounts ON connected_accounts.id = calendar_mappings.connected_account_id
      WHERE calendar_mappings.id = sync_state.calendar_mapping_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own sync state"
  ON sync_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_mappings
      JOIN connected_accounts ON connected_accounts.id = calendar_mappings.connected_account_id
      WHERE calendar_mappings.id = sync_state.calendar_mapping_id
      AND connected_accounts.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_mappings_updated_at
  BEFORE UPDATE ON calendar_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
