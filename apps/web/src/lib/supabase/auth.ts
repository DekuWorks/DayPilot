import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/api";
import { createClient } from "./client";

const NEST_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

export function mapSupabaseUser(
  user: SupabaseUser,
  profile?: {
    display_name?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null
): User {
  const meta = user.user_metadata ?? {};
  const full =
    profile?.display_name ||
    profile?.name ||
    meta.full_name ||
    meta.name ||
    "";
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  const firstName =
    meta.first_name || parts[0] || user.email?.split("@")[0] || "User";
  const lastName = meta.last_name || parts.slice(1).join(" ") || "";

  return {
    id: user.id,
    email: profile?.email || user.email || "",
    firstName,
    lastName,
    avatarUrl: profile?.avatar_url || meta.avatar_url || null,
    role: "USER",
  };
}

export async function fetchProfile(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("email, name, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/** Bridge: exchange Supabase access token for Nest JWT so legacy API keeps working. */
export async function exchangeNestSession(supabaseAccessToken: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl || typeof window === "undefined") return null;
  try {
    const res = await fetch(`${apiUrl}/auth/supabase-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: supabaseAccessToken }),
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
  }
}

export function clearNestSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NEST_KEYS.accessToken);
  localStorage.removeItem(NEST_KEYS.refreshToken);
  localStorage.removeItem(NEST_KEYS.user);
}
