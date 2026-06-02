-- Organizations, Teams & Franchises Support
-- Add organizations, locations, and multi-scope calendar support

-- Create calendar scope enum
CREATE TYPE calendar_scope AS ENUM ('personal', 'organization', 'location');

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'team', 'business', 'enterprise')),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update calendars table to support multiple scopes
ALTER TABLE calendars 
  ADD COLUMN IF NOT EXISTS scope calendar_scope DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

-- Add constraint: scope must match organization_id/location_id
ALTER TABLE calendars
  ADD CONSTRAINT calendars_scope_check CHECK (
    (scope = 'personal' AND organization_id IS NULL AND location_id IS NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL AND location_id IS NULL) OR
    (scope = 'location' AND organization_id IS NOT NULL AND location_id IS NOT NULL)
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendars_organization_id ON calendars(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendars_location_id ON calendars(location_id);
CREATE INDEX IF NOT EXISTS idx_calendars_scope ON calendars(scope);

-- RLS Policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage members"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations of their organizations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = locations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = locations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Update calendars RLS policies to support multi-scope
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can insert own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can update own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can delete own calendars" ON calendars;

-- New policies for multi-scope calendars
CREATE POLICY "Users can view personal calendars"
  ON calendars FOR SELECT
  USING (
    (scope = 'personal' AND owner_id = auth.uid()) OR
    (scope = 'organization' AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = calendars.organization_id
      AND organization_members.user_id = auth.uid()
    )) OR
    (scope = 'location' AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN locations l ON l.organization_id = om.organization_id
      WHERE l.id = calendars.location_id
      AND om.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert personal calendars"
  ON calendars FOR INSERT
  WITH CHECK (
    (scope = 'personal' AND owner_id = auth.uid()) OR
    (scope = 'organization' AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = calendars.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )) OR
    (scope = 'location' AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN locations l ON l.organization_id = om.organization_id
      WHERE l.id = calendars.location_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can update calendars they have access to"
  ON calendars FOR UPDATE
  USING (
    (scope = 'personal' AND owner_id = auth.uid()) OR
    (scope = 'organization' AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = calendars.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )) OR
    (scope = 'location' AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN locations l ON l.organization_id = om.organization_id
      WHERE l.id = calendars.location_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can delete calendars they have access to"
  ON calendars FOR DELETE
  USING (
    (scope = 'personal' AND owner_id = auth.uid()) OR
    (scope = 'organization' AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = calendars.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )) OR
    (scope = 'location' AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN locations l ON l.organization_id = om.organization_id
      WHERE l.id = calendars.location_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    ))
  );

-- Update events RLS policies to support multi-scope
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- New policies for multi-scope events
CREATE POLICY "Users can view events in accessible calendars"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
      AND (
        (calendars.scope = 'personal' AND calendars.owner_id = auth.uid()) OR
        (calendars.scope = 'organization' AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = calendars.organization_id
          AND organization_members.user_id = auth.uid()
        )) OR
        (calendars.scope = 'location' AND EXISTS (
          SELECT 1 FROM organization_members om
          JOIN locations l ON l.organization_id = om.organization_id
          WHERE l.id = calendars.location_id
          AND om.user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can insert events in accessible calendars"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
      AND (
        (calendars.scope = 'personal' AND calendars.owner_id = auth.uid()) OR
        (calendars.scope = 'organization' AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = calendars.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        )) OR
        (calendars.scope = 'location' AND EXISTS (
          SELECT 1 FROM organization_members om
          JOIN locations l ON l.organization_id = om.organization_id
          WHERE l.id = calendars.location_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'member')
        ))
      )
    )
  );

CREATE POLICY "Users can update events in accessible calendars"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
      AND (
        (calendars.scope = 'personal' AND calendars.owner_id = auth.uid()) OR
        (calendars.scope = 'organization' AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = calendars.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        )) OR
        (calendars.scope = 'location' AND EXISTS (
          SELECT 1 FROM organization_members om
          JOIN locations l ON l.organization_id = om.organization_id
          WHERE l.id = calendars.location_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'member')
        ))
      )
    )
  );

CREATE POLICY "Users can delete events in accessible calendars"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
      AND (
        (calendars.scope = 'personal' AND calendars.owner_id = auth.uid()) OR
        (calendars.scope = 'organization' AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = calendars.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
        )) OR
        (calendars.scope = 'location' AND EXISTS (
          SELECT 1 FROM organization_members om
          JOIN locations l ON l.organization_id = om.organization_id
          WHERE l.id = calendars.location_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'member')
        ))
      )
    )
  );

-- Function to update updated_at for organizations and locations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate organization slug from name
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(org_name, '[^a-z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists, append number if needed
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;





