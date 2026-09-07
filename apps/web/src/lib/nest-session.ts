import type { User } from "@/lib/auth-api";

const LEGACY_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

type NestSession = {
  accessToken: string;
  refreshToken: string;
  user?: User;
};

let memory: NestSession | null = null;

if (typeof window !== "undefined") {
  wipeLegacyLocalStorage();
}

function wipeLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEYS.accessToken);
    window.localStorage.removeItem(LEGACY_KEYS.refreshToken);
    window.localStorage.removeItem(LEGACY_KEYS.user);
  } catch {
    // private mode
  }
}

export function getNestAccessToken(): string | null {
  return memory?.accessToken ?? null;
}

export function getNestRefreshToken(): string | null {
  return memory?.refreshToken ?? null;
}

export function setNestSession(session: NestSession) {
  memory = session;
  wipeLegacyLocalStorage();
}

export function clearNestSessionMemory() {
  memory = null;
  wipeLegacyLocalStorage();
}

/** Remaining lifetime of the in-memory Nest access JWT, or null. */
export function nestAccessTokenTtlMs(): number | null {
  const token = getNestAccessToken();
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

export function nestCredentialsInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: init?.headers,
  };
}
