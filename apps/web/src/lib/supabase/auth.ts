import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/api";
import { createClient } from "./client";

const NEST_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;
const NEST_EXCHANGE_TIMEOUT_MS = 5000;

export type ProfileRow = {
  email?: string | null;
  name?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export function mapSupabaseUser(
  user: SupabaseUser,
  profile?: ProfileRow | null
): User {
  const meta = user.user_metadata ?? {};
  const full =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.display_name ||
    profile?.name ||
    meta.full_name ||
    meta.name ||
    "";
  const parts = String(full).trim().split(/\s+/).filter(Boolean);

  const firstName =
    profile?.first_name ||
    meta.first_name ||
    parts[0] ||
    user.email?.split("@")[0] ||
    "there";
  const lastName =
    profile?.last_name || meta.last_name || parts.slice(1).join(" ") || "";
  const username =
    profile?.username ||
    meta.username ||
    null;

  return {
    id: user.id,
    email: profile?.email || user.email || "",
    firstName,
    lastName,
    username: username ? String(username) : null,
    avatarUrl: profile?.avatar_url || meta.avatar_url || null,
    role: "USER",
  };
}

export async function fetchProfile(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "email, name, display_name, first_name, last_name, username, avatar_url"
    )
    .eq("id", userId)
    .maybeSingle();
  return data as ProfileRow | null;
}

/** Bridge: exchange Supabase access token for Nest JWT so legacy API keeps working. */
export async function exchangeNestSession(supabaseAccessToken: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl || typeof window === "undefined") return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    NEST_EXCHANGE_TIMEOUT_MS
  );
  try {
    const res = await fetch(`${apiUrl}/auth/supabase-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: supabaseAccessToken }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      user: User;
    };
    localStorage.setItem(NEST_KEYS.accessToken, data.accessToken);
    localStorage.setItem(NEST_KEYS.refreshToken, data.refreshToken);
    localStorage.setItem(NEST_KEYS.user, JSON.stringify(data.user));
    return data;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function clearNestSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NEST_KEYS.accessToken);
  localStorage.removeItem(NEST_KEYS.refreshToken);
  localStorage.removeItem(NEST_KEYS.user);
}

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}
