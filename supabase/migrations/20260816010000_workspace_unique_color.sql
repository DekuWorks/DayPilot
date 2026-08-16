-- One colour per owner across workspaces. Palette uniqueness is also
-- enforced in the web + Flutter clients.

UPDATE public.workspaces
SET color = upper(color)
WHERE color IS NOT NULL AND color ~ '^#';

DO $$
DECLARE
  rec RECORD;
  taken TEXT[];
  palette TEXT[] := ARRAY[
    '#F97316', '#3B82F6', '#7C3AED', '#C084FC', '#3D9B6A',
    '#14B8A6', '#EC4899', '#F59E0B', '#EF4444', '#38BDF8',
    '#64748B', '#22D3EE'
  ];
  new_color TEXT;
BEGIN
  FOR rec IN
    SELECT id, owner_id
    FROM public.workspaces
    ORDER BY created_at ASC, id ASC
  LOOP
    SELECT array_agg(upper(w.color))
    INTO taken
    FROM public.workspaces w
    WHERE w.owner_id = rec.owner_id AND w.id <> rec.id;

    SELECT upper(color) INTO new_color FROM public.workspaces WHERE id = rec.id;

    IF taken IS NOT NULL AND new_color = ANY (taken) THEN
      SELECT p INTO new_color
      FROM unnest(palette) AS p
      WHERE NOT (p = ANY (taken))
      LIMIT 1;

      IF new_color IS NOT NULL THEN
        UPDATE public.workspaces SET color = new_color WHERE id = rec.id;
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_color_uidx
  ON public.workspaces (owner_id, lower(color));

CREATE OR REPLACE FUNCTION public.ensure_default_workspaces()
RETURNS TRIGGER AS $$
DECLARE
  seeds TEXT[][] := ARRAY[
    ARRAY['Personal', 'personal', '#F97316'],
    ARRAY['Work', 'work', '#3B82F6'],
    ARRAY['Side Projects', 'side', '#7C3AED'],
    ARRAY['School', 'school', '#C084FC']
  ];
  i INT;
  ws_id UUID;
  seed_name TEXT;
  seed_type TEXT;
  seed_color TEXT;
BEGIN
  FOR i IN 1 .. array_length(seeds, 1) LOOP
    seed_name := seeds[i][1];
    seed_type := seeds[i][2];
    seed_color := seeds[i][3];

    SELECT id INTO ws_id
    FROM public.workspaces
    WHERE owner_id = NEW.id AND (type = seed_type OR lower(name) = lower(seed_name))
    ORDER BY created_at ASC
    LIMIT 1;

    IF ws_id IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE owner_id = NEW.id AND lower(color) = lower(seed_color)
      ) THEN
        SELECT p INTO seed_color
        FROM unnest(ARRAY[
          '#F97316', '#3B82F6', '#7C3AED', '#C084FC', '#3D9B6A',
          '#14B8A6', '#EC4899', '#F59E0B', '#EF4444', '#38BDF8'
        ]) AS p
        WHERE NOT EXISTS (
          SELECT 1 FROM public.workspaces
          WHERE owner_id = NEW.id AND lower(color) = lower(p)
        )
        LIMIT 1;
      END IF;

      INSERT INTO public.workspaces (owner_id, name, color, type)
      VALUES (NEW.id, seed_name, seed_color, seed_type)
      RETURNING id INTO ws_id;
    END IF;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
    VALUES (ws_id, NEW.id, 'owner', 'active')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_personal_workspace ON profiles;
CREATE TRIGGER on_profile_personal_workspace
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_default_workspaces();

-- Owner SELECT must not join workspace_members (that policy reads
-- workspaces again and Postgres reports 42P17 infinite recursion).
DROP POLICY IF EXISTS "workspace_select" ON public.workspaces;
CREATE POLICY "workspace_select" ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid());
