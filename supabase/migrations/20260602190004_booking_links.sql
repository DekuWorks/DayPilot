-- Booking Links and Availability System
-- Enables users and organizations to create shareable booking links

-- Booking links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'one-on-one' CHECK (type IN ('one-on-one', 'group')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30, -- minutes
  buffer_before INTEGER NOT NULL DEFAULT 0, -- minutes
  buffer_after INTEGER NOT NULL DEFAULT 0, -- minutes
  min_notice INTEGER NOT NULL DEFAULT 60, -- minutes (minimum notice required)
  max_per_day INTEGER, -- maximum bookings per day (null = unlimited)
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT booking_link_owner_check CHECK (
    (owner_user_id IS NOT NULL AND organization_id IS NULL) OR
    (owner_user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Availability rules table (defines when booking slots are available)
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT availability_time_check CHECK (end_time > start_time)
);

-- Excluded dates table (blackout dates for booking links)
CREATE TABLE IF NOT EXISTS booking_excluded_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE NOT NULL,
  excluded_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_link_id, excluded_date)
);

-- Bookings table (actual appointments made through booking links)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Link to created event
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  booker_phone TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  confirmation_token TEXT UNIQUE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT booking_time_check CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_owner_user_id ON booking_links(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_organization_id ON booking_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_booking_links_is_active ON booking_links(is_active);
CREATE INDEX IF NOT EXISTS idx_availability_rules_booking_link_id ON availability_rules(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_day_of_week ON availability_rules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_excluded_dates_booking_link_id ON booking_excluded_dates(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_booking_excluded_dates_excluded_date ON booking_excluded_dates(excluded_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_link_id ON bookings(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);

-- RLS Policies for booking_links
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking links"
  ON booking_links FOR SELECT
  USING (
    owner_user_id = auth.uid() OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = booking_links.organization_id
      AND organization_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can view active booking links by slug (public)"
  ON booking_links FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can create own booking links"
  ON booking_links FOR INSERT
  WITH CHECK (
    (owner_user_id = auth.uid() AND organization_id IS NULL) OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = booking_links.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can update own booking links"
  ON booking_links FOR UPDATE
  USING (
    owner_user_id = auth.uid() OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = booking_links.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can delete own booking links"
  ON booking_links FOR DELETE
  USING (
    owner_user_id = auth.uid() OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = booking_links.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    ))
  );

-- RLS Policies for availability_rules
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view availability rules for accessible booking links"
  ON availability_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = availability_rules.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
        )) OR
        booking_links.is_active = TRUE -- Public access for active links
      )
    )
  );

CREATE POLICY "Users can manage availability rules for own booking links"
  ON availability_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = availability_rules.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        ))
      )
    )
  );

-- RLS Policies for booking_excluded_dates
ALTER TABLE booking_excluded_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view excluded dates for accessible booking links"
  ON booking_excluded_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_excluded_dates.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
        )) OR
        booking_links.is_active = TRUE -- Public access for active links
      )
    )
  );

CREATE POLICY "Users can manage excluded dates for own booking links"
  ON booking_excluded_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_excluded_dates.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        ))
      )
    )
  );

-- RLS Policies for bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bookings for accessible booking links"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = bookings.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
        )) OR
        bookings.booker_email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Anyone can create bookings for active booking links"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = bookings.booking_link_id
      AND booking_links.is_active = TRUE
    )
  );

CREATE POLICY "Users can update bookings for own booking links"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = bookings.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        )) OR
        bookings.booker_email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete bookings for own booking links"
  ON bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = bookings.booking_link_id
      AND (
        booking_links.owner_user_id = auth.uid() OR
        (booking_links.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = booking_links.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin')
        )) OR
        bookings.booker_email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Function to generate confirmation token
CREATE OR REPLACE FUNCTION generate_confirmation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for booking_links and bookings
CREATE TRIGGER update_booking_links_updated_at
  BEFORE UPDATE ON booking_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create event when booking is confirmed
CREATE OR REPLACE FUNCTION create_event_from_booking()
RETURNS TRIGGER AS $$
DECLARE
  booking_link_record booking_links%ROWTYPE;
  default_calendar_id UUID;
  created_event_id UUID;
BEGIN
  -- Only create event when booking status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get booking link details
    SELECT * INTO booking_link_record
    FROM booking_links
    WHERE id = NEW.booking_link_id;

    -- Find or create default calendar for the booking link owner
    IF booking_link_record.owner_user_id IS NOT NULL THEN
      SELECT id INTO default_calendar_id
      FROM calendars
      WHERE owner_id = booking_link_record.owner_user_id
      AND is_default = TRUE
      LIMIT 1;

      IF default_calendar_id IS NULL THEN
        SELECT id INTO default_calendar_id
        FROM calendars
        WHERE owner_id = booking_link_record.owner_user_id
        LIMIT 1;
      END IF;
    ELSIF booking_link_record.organization_id IS NOT NULL THEN
      -- For organization booking links, use first available calendar
      SELECT id INTO default_calendar_id
      FROM calendars
      WHERE organization_id = booking_link_record.organization_id
      AND scope = 'organization'
      LIMIT 1;
    END IF;

    -- Create event if we have a calendar
    IF default_calendar_id IS NOT NULL THEN
      INSERT INTO events (
        calendar_id,
        title,
        description,
        start,
        "end",
        status,
        timezone
      ) VALUES (
        default_calendar_id,
        COALESCE(booking_link_record.title, 'Booking: ' || NEW.booker_name),
        COALESCE(NEW.notes, '') || E'\n\nBooked by: ' || NEW.booker_name || ' (' || NEW.booker_email || ')',
        NEW.start_time,
        NEW.end_time,
        'scheduled',
        NEW.timezone
      ) RETURNING id INTO created_event_id;

      -- Link the booking to the created event
      UPDATE bookings
      SET event_id = created_event_id
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create event when booking is confirmed
CREATE TRIGGER on_booking_confirmed_create_event
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION create_event_from_booking();

