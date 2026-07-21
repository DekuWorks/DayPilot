-- Separate legal name (first/last) from public username handle.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

COMMENT ON COLUMN profiles.first_name IS 'Given name used in greetings (e.g. Good morning, Marcus)';
COMMENT ON COLUMN profiles.last_name IS 'Family name';
COMMENT ON COLUMN profiles.username IS 'Public handle (e.g. deku), separate from legal name';
COMMENT ON COLUMN profiles.display_name IS 'Legacy full display string; prefer first_name + last_name';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles (lower(username))
  WHERE username IS NOT NULL AND length(trim(username)) > 0;

-- Backfill first/last from existing name/display_name when missing
UPDATE profiles
SET
  first_name = COALESCE(
    NULLIF(trim(first_name), ''),
    NULLIF(split_part(trim(COALESCE(display_name, name, '')), ' ', 1), '')
  ),
  last_name = COALESCE(
    NULLIF(trim(last_name), ''),
    NULLIF(
      trim(regexp_replace(trim(COALESCE(display_name, name, '')), '^\S+\s*', '')),
      ''
    )
  )
WHERE first_name IS NULL OR last_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  meta_last TEXT := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  meta_username TEXT := COALESCE(NEW.raw_user_meta_data->>'username', '');
  meta_name TEXT := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    trim(both FROM meta_first || ' ' || meta_last)
  );
BEGIN
  INSERT INTO public.profiles (
    id, email, name, display_name, first_name, last_name, username
  )
  VALUES (
    NEW.id,
    NEW.email,
    meta_name,
    meta_name,
    NULLIF(meta_first, ''),
    NULLIF(meta_last, ''),
    NULLIF(lower(regexp_replace(meta_username, '[^a-zA-Z0-9_]', '', 'g')), '')
  );

  INSERT INTO public.calendars (owner_id, name, color, is_default)
  VALUES (
    NEW.id,
    'My Calendar',
    '#42E85F',
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
