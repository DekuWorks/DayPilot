/**
 * Friends / social graph client (Supabase).
 *
 * Discovery uses SECURITY DEFINER RPCs so search never exposes email:
 *   - search_daypilot_users, get_public_profiles
 * Mutations go through RPCs that enforce request/friendship rules:
 *   - send_friend_request, respond_friend_request, cancel_friend_request,
 *     remove_friend
 * Favorites are a capped pin list (MAX_FAVORITES) on user_favorites; friendships
 * are bidirectional rows written by the respond RPC.
 */

import { createClient } from "@/lib/supabase/client";

export type PublicUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FriendRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type FriendRequest = {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  otherUser: PublicUser | null;
  direction: "incoming" | "outgoing";
};

export type Friend = PublicUser & {
  friendsSince: string;
  isFavorite: boolean;
};

export const MAX_FAVORITES = 5;

type PublicProfileRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type FriendRequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
};

function mapPublicUser(row: PublicProfileRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

export function formatPublicName(user: PublicUser): string {
  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return (
    user.displayName ||
    fromParts ||
    (user.username ? `@${user.username}` : "DayPilot user")
  );
}

async function loadPublicProfiles(
  ids: string[]
): Promise<Map<string, PublicUser>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, PublicUser>();
  if (unique.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_profiles", {
    user_ids: unique,
  });
  if (error) throw new Error(error.message);

  for (const row of (data as PublicProfileRow[]) ?? []) {
    map.set(row.id, mapPublicUser(row));
  }
  return map;
}

export async function searchUsers(query: string): Promise<PublicUser[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_daypilot_users", {
    search_query: q,
    result_limit: 20,
  });
  if (error) throw new Error(error.message);
  return ((data as PublicProfileRow[]) ?? []).map(mapPublicUser);
}

export async function listFriends(userId: string): Promise<Friend[]> {
  const supabase = createClient();
  const [{ data: friendshipRows, error: fErr }, { data: favRows, error: favErr }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("friend_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_favorites")
        .select("favorited_user_id")
        .eq("user_id", userId),
    ]);

  if (fErr) throw new Error(fErr.message);
  if (favErr) throw new Error(favErr.message);

  const rows = (friendshipRows as { friend_id: string; created_at: string }[]) ?? [];
  const favoriteIds = new Set(
    ((favRows as { favorited_user_id: string }[]) ?? []).map(
      (r) => r.favorited_user_id
    )
  );

  const profiles = await loadPublicProfiles(rows.map((r) => r.friend_id));
  return rows
    .map((r) => {
      const profile = profiles.get(r.friend_id);
      if (!profile) return null;
      return {
        ...profile,
        friendsSince: r.created_at,
        isFavorite: favoriteIds.has(r.friend_id),
      };
    })
    .filter((f): f is Friend => f != null)
    .sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return formatPublicName(a).localeCompare(formatPublicName(b));
    });
}

export async function listFavorites(userId: string): Promise<PublicUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_favorites")
    .select("favorited_user_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows =
    (data as { favorited_user_id: string; created_at: string }[]) ?? [];
  const profiles = await loadPublicProfiles(rows.map((r) => r.favorited_user_id));
  return rows
    .map((r) => profiles.get(r.favorited_user_id) ?? null)
    .filter((u): u is PublicUser => u != null);
}

export async function listFriendRequests(
  userId: string
): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .eq("status", "pending")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data as FriendRequestRow[]) ?? [];
  const otherIds = rows.map((r) =>
    r.requester_id === userId ? r.recipient_id : r.requester_id
  );
  const profiles = await loadPublicProfiles(otherIds);

  const mapped = rows.map((r): FriendRequest => {
    const direction: "incoming" | "outgoing" =
      r.recipient_id === userId ? "incoming" : "outgoing";
    const otherId =
      direction === "incoming" ? r.requester_id : r.recipient_id;
    return {
      id: r.id,
      requesterId: r.requester_id,
      recipientId: r.recipient_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      otherUser: profiles.get(otherId) ?? null,
      direction,
    };
  });

  return {
    incoming: mapped.filter((r) => r.direction === "incoming"),
    outgoing: mapped.filter((r) => r.direction === "outgoing"),
  };
}

export async function sendFriendRequest(
  recipientId: string
): Promise<FriendRequestRow> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_friend_request", {
    p_recipient_id: recipientId,
  });
  if (error) throw new Error(error.message);
  return data as FriendRequestRow;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("respond_friend_request", {
    p_request_id: requestId,
    p_accept: true,
  });
  if (error) throw new Error(error.message);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("respond_friend_request", {
    p_request_id: requestId,
    p_accept: false,
  });
  if (error) throw new Error(error.message);
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_friend_request", {
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
}

export async function removeFriend(friendId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_friend", {
    p_friend_id: friendId,
  });
  if (error) throw new Error(error.message);
}

export async function pinFavorite(
  userId: string,
  favoritedUserId: string
): Promise<void> {
  const supabase = createClient();
  const { count, error: countErr } = await supabase
    .from("user_favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= MAX_FAVORITES) {
    throw new Error(`You can pin up to ${MAX_FAVORITES} favorites`);
  }

  const { error } = await supabase.from("user_favorites").insert({
    user_id: userId,
    favorited_user_id: favoritedUserId,
  });
  if (error) {
    if (error.message.toLowerCase().includes("maximum of 5")) {
      throw new Error(`You can pin up to ${MAX_FAVORITES} favorites`);
    }
    throw new Error(error.message);
  }
}

export async function unpinFavorite(
  userId: string,
  favoritedUserId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("favorited_user_id", favoritedUserId);
  if (error) throw new Error(error.message);
}

export type UserRelation =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "outgoing_pending"; requestId: string }
  | { kind: "incoming_pending"; requestId: string }
  | { kind: "none" };

export async function getRelationToUser(
  myId: string,
  otherId: string
): Promise<UserRelation> {
  if (myId === otherId) return { kind: "self" };

  const supabase = createClient();
  const [{ data: friendship }, { data: requests }] = await Promise.all([
    supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", myId)
      .eq("friend_id", otherId)
      .maybeSingle(),
    supabase
      .from("friend_requests")
      .select("id, requester_id, recipient_id")
      .eq("status", "pending")
      .or(
        `and(requester_id.eq.${myId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${myId})`
      )
      .limit(1),
  ]);

  if (friendship) return { kind: "friends" };

  const req = (requests as { id: string; requester_id: string; recipient_id: string }[] | null)?.[0];
  if (req) {
    if (req.requester_id === myId) {
      return { kind: "outgoing_pending", requestId: req.id };
    }
    return { kind: "incoming_pending", requestId: req.id };
  }

  return { kind: "none" };
}
