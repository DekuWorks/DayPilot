-- Host meeting choices for booking links.
-- Private destinations live in booking_link_meetings. Guests cannot select that table.
-- Existing bookings stay valid: a link with no row still books without a method.
--
-- Rollback: drop the trigger and function, then drop booking_link_meetings and the
-- new bookings columns. Do not delete booking rows.

CREATE TABLE IF NOT EXISTS booking_link_meetings (
  booking_link_id UUID PRIMARY KEY REFERENCES booking_links(id) ON DELETE CASCADE,
  methods TEXT[] NOT NULL DEFAULT '{}',
  host_meeting_url TEXT,
  host_phone TEXT,
  host_slack_url TEXT,
  host_discord_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE booking_link_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage meeting setup"
  ON booking_link_meetings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_meetings.booking_link_id
      AND booking_links.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_meetings.booking_link_id
      AND booking_links.owner_user_id = auth.uid()
    )
  );

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS meeting_method TEXT,
  ADD COLUMN IF NOT EXISTS meeting_join_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_status TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_confirmed_slot
  ON bookings (booking_link_id, lower(booker_email), start_time)
  WHERE status = 'confirmed';

CREATE OR REPLACE FUNCTION public.public_meeting_choices(link_id UUID)
RETURNS TABLE (id TEXT, label TEXT, detail TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT choice.id, choice.label, choice.detail
  FROM booking_link_meetings meeting
  CROSS JOIN LATERAL (
    VALUES
      (
        'link',
        'Meeting link',
        'The host sends the link after you book. It is not shown on this page.',
        meeting.host_meeting_url,
        '^https?://'
      ),
      (
        'phone',
        'Phone call',
        'The host will call you. Their number is not shown on this page.',
        meeting.host_phone,
        '^[0-9+() -]{8,}$'
      ),
      (
        'slack',
        'Slack',
        'You get a Slack link after you book. You may need to be in that workspace.',
        meeting.host_slack_url,
        '^https?://'
      ),
      (
        'discord',
        'Discord',
        'You get a Discord invite after you book.',
        meeting.host_discord_url,
        '^https?://'
      )
  ) AS choice(id, label, detail, destination, pattern)
  WHERE meeting.booking_link_id = link_id
    AND choice.id = ANY (meeting.methods)
    AND choice.destination IS NOT NULL
    AND choice.destination ~* choice.pattern
    AND EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = link_id
      AND booking_links.is_active = TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.public_meeting_choices(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_meeting_choices(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_booking_meeting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meeting booking_link_meetings%ROWTYPE;
  destination TEXT;
  ready_count INTEGER;
BEGIN
  NEW.meeting_join_url := NULL;
  SELECT * INTO meeting
  FROM booking_link_meetings
  WHERE booking_link_id = NEW.booking_link_id;

  ready_count := 0;
  IF meeting.booking_link_id IS NOT NULL THEN
    IF 'link' = ANY (meeting.methods) AND meeting.host_meeting_url ~* '^https?://' THEN
      ready_count := ready_count + 1;
    END IF;
    IF 'phone' = ANY (meeting.methods) AND meeting.host_phone ~ '^[0-9+() -]{8,}$' THEN
      ready_count := ready_count + 1;
    END IF;
    IF 'slack' = ANY (meeting.methods) AND meeting.host_slack_url ~* '^https?://' THEN
      ready_count := ready_count + 1;
    END IF;
    IF 'discord' = ANY (meeting.methods) AND meeting.host_discord_url ~* '^https?://' THEN
      ready_count := ready_count + 1;
    END IF;
  END IF;

  IF NEW.meeting_method IS NULL OR length(trim(NEW.meeting_method)) = 0 THEN
    IF ready_count > 0 THEN
      RAISE EXCEPTION 'choose a meeting method';
    END IF;
    NEW.meeting_method := NULL;
    NEW.meeting_status := 'legacy';
    RETURN NEW;
  END IF;

  destination := NULL;
  IF meeting.booking_link_id IS NOT NULL AND NEW.meeting_method = ANY (meeting.methods) THEN
    IF NEW.meeting_method = 'link' AND meeting.host_meeting_url ~* '^https?://' THEN
      destination := trim(meeting.host_meeting_url);
    ELSIF NEW.meeting_method = 'slack' AND meeting.host_slack_url ~* '^https?://' THEN
      destination := trim(meeting.host_slack_url);
    ELSIF NEW.meeting_method = 'discord' AND meeting.host_discord_url ~* '^https?://' THEN
      destination := trim(meeting.host_discord_url);
    ELSIF NEW.meeting_method = 'phone' AND meeting.host_phone ~ '^[0-9+() -]{8,}$' THEN
      destination := '';
    END IF;
  END IF;

  IF destination IS NULL THEN
    RAISE EXCEPTION 'meeting method is not available';
  END IF;

  IF NEW.meeting_method = 'phone' THEN
    NEW.meeting_join_url := NULL;
  ELSE
    NEW.meeting_join_url := destination;
  END IF;
  NEW.meeting_status := 'ready';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_meeting ON bookings;
CREATE TRIGGER bookings_enforce_meeting
  BEFORE INSERT OR UPDATE OF meeting_method, meeting_join_url
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_meeting();
