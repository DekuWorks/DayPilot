-- Fix infinite recursion in organization_members RLS (Postgres 42P17).
-- Self-referencing policies re-enter RLS on organization_members.
-- SECURITY DEFINER helpers bypass RLS for membership checks.

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_writer(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_writer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_writer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "Owners and admins can manage members" ON organization_members;
CREATE POLICY "Owners and admins can manage members"
  ON organization_members FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- Organizations: avoid nested RLS on members via helpers
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_org_member(id)
  );

DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.is_org_admin(id)
  );

-- Locations
DROP POLICY IF EXISTS "Users can view locations of their organizations" ON locations;
CREATE POLICY "Users can view locations of their organizations"
  ON locations FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Owners and admins can manage locations" ON locations;
CREATE POLICY "Owners and admins can manage locations"
  ON locations FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- Calendars: use helpers instead of recursive member EXISTS
DROP POLICY IF EXISTS "Users can view personal calendars" ON calendars;
CREATE POLICY "Users can view personal calendars"
  ON calendars FOR SELECT
  USING (
    (scope = 'personal' AND owner_id = auth.uid())
    OR (scope = 'organization' AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
    OR (
      scope = 'location'
      AND location_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM locations l
        WHERE l.id = calendars.location_id
          AND public.is_org_member(l.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert personal calendars" ON calendars;
CREATE POLICY "Users can insert personal calendars"
  ON calendars FOR INSERT
  WITH CHECK (
    (scope = 'personal' AND owner_id = auth.uid())
    OR (scope = 'organization' AND organization_id IS NOT NULL AND public.is_org_writer(organization_id))
    OR (
      scope = 'location'
      AND location_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM locations l
        WHERE l.id = calendars.location_id
          AND public.is_org_writer(l.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update calendars they have access to" ON calendars;
CREATE POLICY "Users can update calendars they have access to"
  ON calendars FOR UPDATE
  USING (
    (scope = 'personal' AND owner_id = auth.uid())
    OR (scope = 'organization' AND organization_id IS NOT NULL AND public.is_org_writer(organization_id))
    OR (
      scope = 'location'
      AND location_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM locations l
        WHERE l.id = calendars.location_id
          AND public.is_org_writer(l.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete calendars they have access to" ON calendars;
CREATE POLICY "Users can delete calendars they have access to"
  ON calendars FOR DELETE
  USING (
    (scope = 'personal' AND owner_id = auth.uid())
    OR (scope = 'organization' AND organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR (
      scope = 'location'
      AND location_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM locations l
        WHERE l.id = calendars.location_id
          AND public.is_org_admin(l.organization_id)
      )
    )
  );

-- Events: keep own-user shortcut + accessible calendars without recursive member scans
DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON events;
CREATE POLICY "Users can view events in accessible calendars"
  ON events FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
        AND (
          (calendars.scope = 'personal' AND calendars.owner_id = auth.uid())
          OR (
            calendars.scope = 'organization'
            AND calendars.organization_id IS NOT NULL
            AND public.is_org_member(calendars.organization_id)
          )
          OR (
            calendars.scope = 'location'
            AND calendars.location_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM locations l
              WHERE l.id = calendars.location_id
                AND public.is_org_member(l.organization_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert events in accessible calendars" ON events;
CREATE POLICY "Users can insert events in accessible calendars"
  ON events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
        AND (
          (calendars.scope = 'personal' AND calendars.owner_id = auth.uid())
          OR (
            calendars.scope = 'organization'
            AND calendars.organization_id IS NOT NULL
            AND public.is_org_writer(calendars.organization_id)
          )
          OR (
            calendars.scope = 'location'
            AND calendars.location_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM locations l
              WHERE l.id = calendars.location_id
                AND public.is_org_writer(l.organization_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update events in accessible calendars" ON events;
CREATE POLICY "Users can update events in accessible calendars"
  ON events FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
        AND (
          (calendars.scope = 'personal' AND calendars.owner_id = auth.uid())
          OR (
            calendars.scope = 'organization'
            AND calendars.organization_id IS NOT NULL
            AND public.is_org_writer(calendars.organization_id)
          )
          OR (
            calendars.scope = 'location'
            AND calendars.location_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM locations l
              WHERE l.id = calendars.location_id
                AND public.is_org_writer(l.organization_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete events in accessible calendars" ON events;
CREATE POLICY "Users can delete events in accessible calendars"
  ON events FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM calendars
      WHERE calendars.id = events.calendar_id
        AND (
          (calendars.scope = 'personal' AND calendars.owner_id = auth.uid())
          OR (
            calendars.scope = 'organization'
            AND calendars.organization_id IS NOT NULL
            AND public.is_org_writer(calendars.organization_id)
          )
          OR (
            calendars.scope = 'location'
            AND calendars.location_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM locations l
              WHERE l.id = calendars.location_id
                AND public.is_org_writer(l.organization_id)
            )
          )
        )
    )
  );
