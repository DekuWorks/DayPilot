import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/api";
import { createClient } from "./client";

const NEST_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

/** Keep Nest bridge snappy — never block UI on a cold/unreachable API. */
export const NEST_EXCHANGE_TIMEOUT_MS = 2_500;
export const PROFILE_FETCH_TIMEOUT_MS = 3_000;

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
    avatarUrl: profile?.avatar_url || metadataAvatarUrl(user),
    role: "USER",
  };
}

/** Google / Apple / Microsoft store the photo on the auth user. */
export function metadataAvatarUrl(user: SupabaseUser): string | null {
  const meta = user.user_metadata ?? {};
  for (const key of ["avatar_url", "picture", "avatar"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Write the SSO photo into profiles so iOS and web share one URL. */
export async function persistSharedAvatarIfMissing(
  user: SupabaseUser,
  profile: ProfileRow | null
): Promise<ProfileRow | null> {
  if (profile?.avatar_url?.trim()) return profile;
  const fromAuth = metadataAvatarUrl(user);
  if (!fromAuth) return profile;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: fromAuth,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) return profile;
    return { ...(profile ?? {}), avatar_url: fromAuth };
  } catch {
    return profile;
  }
}

export async function fetchProfile(
  userId: string,
  signal?: AbortSignal
): Promise<ProfileRow | null> {
  const supabase = createClient();
  let query = supabase
    .from("profiles")
    .select(
      "email, name, display_name, first_name, last_name, username, avatar_url"
    )
    .eq("id", userId);

  if (signal && typeof query.abortSignal === "function") {
    query = query.abortSignal(signal);
  }

  const resultPromise = query.maybeSingle();

  if (!signal) {
    const { data } = await resultPromise;
    return data as ProfileRow | null;
  }

  const { data } = await Promise.race([
    resultPromise,
    new Promise<never>((_, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    }),
  ]);
  return data as ProfileRow | null;
}

/** Bridge: exchange Supabase access token for Nest JWT so legacy API keeps working. */
export async function exchangeNestSession(
  supabaseAccessToken: string,
  opts?: { timeoutMs?: number }
) {
  const apiUrl = getApiUrl();
  if (!apiUrl || typeof window === "undefined") return null;

  const timeoutMs = opts?.timeoutMs ?? NEST_EXCHANGE_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

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
    // Unreachable/cold Nest (or localhost IPv6 hang) must never stall auth UI.
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Remaining lifetime of the stored Nest access JWT, or null if missing/invalid. */
export function nestAccessTokenTtlMs(): number | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(NEST_KEYS.accessToken);
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (json.length % 4)) % 4);
    const payload = JSON.parse(atob(json + pad)) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

export function hasNestAccessToken(): boolean {
  const ttl = nestAccessTokenTtlMs();
  return ttl != null && ttl > 30_000;
}

async function refreshNestSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = localStorage.getItem(NEST_KEYS.refreshToken);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      user: User;
    };
    localStorage.setItem(NEST_KEYS.accessToken, data.accessToken);
    localStorage.setItem(NEST_KEYS.refreshToken, data.refreshToken);
    localStorage.setItem(NEST_KEYS.user, JSON.stringify(data.user));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a usable Nest JWT exists before Sync / calendar-connections calls.
 * Refreshes an expired Nest token, then re-exchanges the Supabase session.
 */
export async function ensureNestSession(opts?: {
  timeoutMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not in browser" };
  }
  if (hasNestAccessToken()) return { ok: true };

  if (await refreshNestSession()) return { ok: true };

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const supabaseToken = data.session?.access_token;
    if (!supabaseToken) {
      return {
        ok: false,
        error: "Sign in again — no session for calendar sync API.",
      };
    }
    const exchanged = await exchangeNestSession(supabaseToken, {
      timeoutMs: opts?.timeoutMs ?? 8_000,
    });
    if (!exchanged) {
      return {
        ok: false,
        error:
          "Calendar sync API is unreachable or rejected the session. Is Nest running on the API URL?",
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to prepare sync session",
    };
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
