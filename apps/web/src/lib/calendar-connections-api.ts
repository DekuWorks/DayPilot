import { getApiUrl, getAuthHeaders, getApiErrorMessage } from "./api";
import { ensureNestSession } from "./supabase/auth";

export type CalendarProvider =
  | "google"
  | "outlook"
  | "apple"
  | "apple_eventkit";

export type ConnectionValidationStatus =
  | "valid"
  | "expired"
  | "needs_reconnect"
  | "unknown";

export type CalendarConnection = {
  id: string;
  provider: CalendarProvider;
  email: string;
  syncedAt: string | null;
  validatedAt: string | null;
  expiresAt: string | null;
  connectedAt: string;
  status: ConnectionValidationStatus;
  connected: boolean;
};

export type ValidateConnectionResult = {
  ok: boolean;
  valid: boolean;
  status: ConnectionValidationStatus;
  validatedAt: string | null;
  expiresAt?: string | null;
  error?: string;
  message?: string;
};

export type ConnectUrlResult = {
  redirectUrl: string | null;
  needsCredentials?: boolean;
  error?: string;
};

async function withNestAuth<T>(fn: () => Promise<T>): Promise<T> {
  const ready = await ensureNestSession();
  if (!ready.ok) {
    throw new Error(ready.error);
  }
  return fn();
}

export async function listConnections(): Promise<CalendarConnection[]> {
  return withNestAuth(async () => {
    const res = await fetch(`${getApiUrl()}/calendar-connections`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to load connections"));
    }
    const data = (await res.json()) as CalendarConnection[];
    return data.map((c) => ({
      ...c,
      validatedAt: c.validatedAt ?? null,
      expiresAt: c.expiresAt ?? null,
      status: c.status ?? "unknown",
      connected: c.connected ?? true,
    }));
  });
}

export async function getConnectUrl(
  provider: CalendarProvider
): Promise<ConnectUrlResult> {
  return withNestAuth(async () => {
    const res = await fetch(
      `${getApiUrl()}/calendar-connections/${provider}/connect`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to get connect URL"));
    }
    return res.json();
  });
}

/** Strip spaces from Apple app-specific passwords before send. */
export function normalizeAppSpecificPassword(raw: string): string {
  return raw.replace(/[\s\u00A0\u202F\u2007]+/g, "").trim();
}

export type EventKitConnectionStatus = {
  authSeparate: boolean;
  hasGoogleConnection: boolean;
  hasMicrosoftConnection: boolean;
  connections: Array<{
    id: string;
    provider: string;
    displayName: string;
    deviceId: string;
    authStatus: string;
    calendarStatus: string;
    syncStatus: string;
    lastSyncedAt: string | null;
    calendars: Array<{
      id: string;
      title: string;
      isSelected: boolean;
      isReadOnly: boolean;
      sourceName?: string | null;
    }>;
  }>;
};

/** Apple EventKit connection status (synced from iOS). */
export async function getEventKitStatus(): Promise<EventKitConnectionStatus> {
  return withNestAuth(async () => {
    const res = await fetch(
      `${getApiUrl()}/calendar-connections/apple/eventkit`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        getApiErrorMessage(err, "Failed to load Apple Calendar status")
      );
    }
    return res.json();
  });
}

export async function disconnectConnection(
  id: string
): Promise<{ ok: boolean }> {
  return withNestAuth(async () => {
    const res = await fetch(`${getApiUrl()}/calendar-connections/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to disconnect"));
    }
    return res.json();
  });
}

export async function syncConnection(id: string): Promise<{ ok: boolean }> {
  return withNestAuth(async () => {
    const res = await fetch(`${getApiUrl()}/calendar-connections/${id}/sync`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to sync"));
    }
    return res.json();
  });
}

export async function validateConnection(
  id: string
): Promise<ValidateConnectionResult> {
  return withNestAuth(async () => {
    const res = await fetch(
      `${getApiUrl()}/calendar-connections/${id}/validate`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to validate connection"));
    }
    return res.json();
  });
}

export function statusLabel(status: ConnectionValidationStatus): string {
  switch (status) {
    case "valid":
      return "Validated";
    case "expired":
      return "Token expired";
    case "needs_reconnect":
      return "Needs reconnect";
    default:
      return "Not validated yet";
  }
}

/**
 * Sync healthy / expired-with-refresh OAuth connections, then touch EventKit
 * via Nest GET /:id/sync (web cannot push EventKit events).
 */
export async function syncAllConnections(args: {
  connections: CalendarConnection[];
  eventKitConnectionId?: string | null;
}): Promise<number> {
  let count = 0;
  for (const c of args.connections) {
    if (c.provider === "apple" || c.provider === "apple_eventkit") continue;
    if (c.status === "needs_reconnect") continue;
    await syncConnection(c.id);
    count += 1;
  }
  if (args.eventKitConnectionId) {
    await syncConnection(args.eventKitConnectionId);
    count += 1;
  }
  return count;
}
