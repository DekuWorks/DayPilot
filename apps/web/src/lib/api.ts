import { getNestAccessToken, nestCredentialsInit } from "./nest-session";

// Prefer 127.0.0.1 — macOS "localhost" can stall ~60s on IPv6 when API is down.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

export function getApiUrl() {
  return API_URL;
}

/** Normalize Nest/class-validator error bodies for UI display. */
export function getApiErrorMessage(body: unknown, fallback: string): string {
  if (body == null || typeof body !== "object") return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).join(", ");
  }
  return fallback;
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = getNestAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Nest API fetch: Bearer from memory when present, always send credentials so
 * httpOnly access cookies work after a hard refresh / background enrich.
 */
export function nestFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = typeof window !== "undefined" ? getNestAccessToken() : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, nestCredentialsInit({ ...init, headers }));
}
