-- Pilot Brief chat: one conversation per user per day.
-- Clients read via RLS; the pilot-brief Edge Function writes with the service role.

CREATE TABLE IF NOT EXISTS public.pilot_brief_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pilot_brief_messages IS
  'DayPilot Pilot Brief chat turns, scoped to user + brief_date';

CREATE INDEX IF NOT EXISTS idx_pilot_brief_messages_user_date
  ON public.pilot_brief_messages (user_id, brief_date, created_at);

ALTER TABLE public.pilot_brief_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pilot_brief_messages_owner" ON public.pilot_brief_messages;
CREATE POLICY "pilot_brief_messages_owner" ON public.pilot_brief_messages FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
