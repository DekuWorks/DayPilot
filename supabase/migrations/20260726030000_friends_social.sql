-- DayPilot social graph: user search (no email), friend requests, friendships, favorites (max 5).

-- ---------------------------------------------------------------------------
-- Public profile discovery (username / name only — never email)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_daypilot_users(
  search_query text,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  username text,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    COALESCE(
      NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      NULLIF(trim(p.display_name), ''),
      NULLIF(trim(p.name), ''),
      p.username
    ) AS display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(trim(COALESCE(search_query, ''))) >= 1
    AND (
      p.username ILIKE '%' || trim(search_query) || '%'
      OR p.first_name ILIKE '%' || trim(search_query) || '%'
      OR p.last_name ILIKE '%' || trim(search_query) || '%'
      OR p.display_name ILIKE '%' || trim(search_query) || '%'
      OR p.name ILIKE '%' || trim(search_query) || '%'
      OR concat_ws(' ', p.first_name, p.last_name) ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY
    CASE
      WHEN lower(p.username) = lower(trim(search_query)) THEN 0
      WHEN lower(p.username) LIKE lower(trim(search_query)) || '%' THEN 1
      ELSE 2
    END,
    p.username NULLS LAST,
    p.first_name NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 20), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_daypilot_users(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_daypilot_users(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    COALESCE(
      NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      NULLIF(trim(p.display_name), ''),
      NULLIF(trim(p.name), ''),
      p.username
    ) AS display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Friend requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester
  ON friend_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient
  ON friend_requests(recipient_id, status);

-- At most one pending request per unordered pair
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_pair_uidx
  ON friend_requests (
    LEAST(requester_id, recipient_id),
    GREATEST(requester_id, recipient_id)
  )
  WHERE status = 'pending';

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_requests_select_participants" ON friend_requests;
CREATE POLICY "friend_requests_select_participants" ON friend_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Inserts go through send_friend_request(); keep direct insert locked down
DROP POLICY IF EXISTS "friend_requests_insert_own" ON friend_requests;
CREATE POLICY "friend_requests_insert_own" ON friend_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "friend_requests_update_participants" ON friend_requests;
CREATE POLICY "friend_requests_update_participants" ON friend_requests
  FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ---------------------------------------------------------------------------
-- Friendships (bidirectional rows for simple queries)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS friendships (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select_own" ON friendships;
CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Inserts only via SECURITY DEFINER accept path
DROP POLICY IF EXISTS "friendships_no_direct_insert" ON friendships;
CREATE POLICY "friendships_no_direct_insert" ON friendships
  FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- User favorites (pin up to 5 users; layered on friends, not required)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favorited_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorited_user_id),
  CHECK (user_id <> favorited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_favorited
  ON user_favorites(favorited_user_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_favorites_owner" ON user_favorites;
CREATE POLICY "user_favorites_owner" ON user_favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_user_favorites_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fav_count int;
BEGIN
  SELECT COUNT(*) INTO fav_count
  FROM public.user_favorites
  WHERE user_id = NEW.user_id;

  IF fav_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 favorites allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_favorites_limit ON user_favorites;
CREATE TRIGGER trg_user_favorites_limit
  BEFORE INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_favorites_limit();

-- ---------------------------------------------------------------------------
-- RPCs: send / respond / cancel / unfriend / list helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.user_id = a AND f.friend_id = b
  );
$$;

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_recipient_id uuid)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing public.friend_requests;
  created public.friend_requests;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_recipient_id IS NULL OR p_recipient_id = me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF public.are_friends(me, p_recipient_id) THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  SELECT * INTO existing
  FROM public.friend_requests
  WHERE status = 'pending'
    AND (
      (requester_id = me AND recipient_id = p_recipient_id)
      OR (requester_id = p_recipient_id AND recipient_id = me)
    )
  LIMIT 1;

  IF FOUND THEN
    IF existing.requester_id = me THEN
      RAISE EXCEPTION 'Friend request already sent';
    ELSE
      RAISE EXCEPTION 'This user already sent you a friend request';
    END IF;
  END IF;

  INSERT INTO public.friend_requests (requester_id, recipient_id, status)
  VALUES (me, p_recipient_id, 'pending')
  RETURNING * INTO created;

  RETURN created;
END;
$$;

REVOKE ALL ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_request_id uuid,
  p_accept boolean
)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  req public.friend_requests;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO req
  FROM public.friend_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;
  IF req.recipient_id <> me THEN
    RAISE EXCEPTION 'Only the recipient can respond';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Friend request is no longer pending';
  END IF;

  IF p_accept THEN
    UPDATE public.friend_requests
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO req;

    -- Bypass RLS insert deny on friendships (client inserts remain blocked)
    PERFORM set_config('row_security', 'off', true);

    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (req.requester_id, req.recipient_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (req.recipient_id, req.requester_id)
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.friend_requests
    SET status = 'declined', updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO req;
  END IF;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_request_id uuid)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  req public.friend_requests;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO req
  FROM public.friend_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;
  IF req.requester_id <> me THEN
    RAISE EXCEPTION 'Only the requester can cancel';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Friend request is no longer pending';
  END IF;

  UPDATE public.friend_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO req;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_friend_id IS NULL OR p_friend_id = me THEN
    RAISE EXCEPTION 'Invalid friend';
  END IF;

  DELETE FROM public.friendships
  WHERE (user_id = me AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = me);

  DELETE FROM public.user_favorites
  WHERE (user_id = me AND favorited_user_id = p_friend_id);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

-- Allow SECURITY DEFINER functions to insert friendships (bypass RLS)
-- respond_friend_request runs as owner; ensure table owner can insert.
-- Grant insert to postgres/supabase_admin is implicit for SECURITY DEFINER owner.

COMMENT ON TABLE friend_requests IS 'Pending/accepted/declined/cancelled friend requests between DayPilot users';
COMMENT ON TABLE friendships IS 'Accepted friendships; stored bidirectionally (user_id, friend_id) and (friend_id, user_id)';
COMMENT ON TABLE user_favorites IS 'Pinned favorite users (max 5 per user); distinct from friendships';
COMMENT ON FUNCTION public.search_daypilot_users(text, int) IS 'Search users by username/name without exposing email';
