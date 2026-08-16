import type {
  CalendarConnection,
  ConnectionValidationStatus,
  EventKitConnectionStatus,
} from "./calendar-connections-api";

/** One honest status per calendar provider. No stacked “Connected” + “expired”. */
export type CalendarUiTone = "healthy" | "needsAttention" | "notConnected";

export type SyncAllHint =
  | "needsReconnect"
  | "lastSynced"
  | "neverSynced"
  | "noneConnected";

export type CalendarProviderUi = {
  id: "google" | "outlook" | "apple";
  name: string;
  tone: CalendarUiTone;
  headline: string;
  detail: string;
  lastSynced: string | null;
  connectionId: string | null;
  canReconnect: boolean;
  canSync: boolean;
  calendarCount: number;
};

export function connectionForProvider(
  connections: CalendarConnection[],
  provider: string
): CalendarConnection | undefined {
  return connections.find((c) => c.provider === provider);
}

export function mapOAuthProviderUi(args: {
  id: "google" | "outlook";
  name: string;
  connection?: CalendarConnection;
}): CalendarProviderUi {
  const { id, name, connection } = args;
  if (!connection) {
    return {
      id,
      name,
      tone: "notConnected",
      headline: "Not connected",
      detail: "",
      lastSynced: null,
      connectionId: null,
      canReconnect: false,
      canSync: false,
      calendarCount: 0,
    };
  }

  const status: ConnectionValidationStatus = connection.status ?? "unknown";
  if (status === "expired" || status === "needs_reconnect") {
    return {
      id,
      name,
      tone: "needsAttention",
      headline: status === "expired" ? "Token expired" : "Needs reconnect",
      detail: connection.email,
      lastSynced: connection.syncedAt,
      connectionId: connection.id,
      canReconnect: true,
      canSync: false,
      calendarCount: 0,
    };
  }

  return {
    id,
    name,
    tone: "healthy",
    headline: "Connected",
    detail: connection.email,
    lastSynced: connection.syncedAt,
    connectionId: connection.id,
    canReconnect: false,
    canSync: true,
    calendarCount: 0,
  };
}

/** Profile/Sync Apple row = EventKit, never Sign in with Apple. */
export function mapAppleEventKitUi(
  eventKitStatus: EventKitConnectionStatus | null | undefined
): CalendarProviderUi {
  const connections = eventKitStatus?.connections ?? [];
  if (connections.length === 0) {
    return {
      id: "apple",
      name: "Apple",
      tone: "notConnected",
      headline: "Not connected",
      detail: "",
      lastSynced: null,
      connectionId: null,
      canReconnect: false,
      canSync: false,
      calendarCount: 0,
    };
  }

  const conn = connections[0];
  const calendars = conn.calendars ?? [];
  const displayName = conn.displayName?.trim();
  const device = displayName && displayName.length > 0 ? displayName : "iPhone";

  return {
    id: "apple",
    name: "Apple",
    tone: "healthy",
    headline: "Connected",
    detail: `${device} · ${calendars.length} calendars`,
    lastSynced: conn.lastSyncedAt,
    connectionId: conn.id,
    canReconnect: false,
    canSync: true,
    calendarCount: calendars.length,
  };
}

export function buildCalendarProviderRows(args: {
  connections: CalendarConnection[];
  eventKitStatus: EventKitConnectionStatus | null | undefined;
}): CalendarProviderUi[] {
  return [
    mapOAuthProviderUi({
      id: "google",
      name: "Google",
      connection: connectionForProvider(args.connections, "google"),
    }),
    mapOAuthProviderUi({
      id: "outlook",
      name: "Outlook",
      connection: connectionForProvider(args.connections, "outlook"),
    }),
    mapAppleEventKitUi(args.eventKitStatus),
  ];
}

export function latestSyncAt(rows: CalendarProviderUi[]): string | null {
  let latest: string | null = null;
  let latestMs = 0;
  for (const row of rows) {
    if (!row.lastSynced) continue;
    const ms = Date.parse(row.lastSynced);
    if (Number.isNaN(ms)) continue;
    if (latest === null || ms > latestMs) {
      latest = row.lastSynced;
      latestMs = ms;
    }
  }
  return latest;
}

export function syncAllHint(rows: CalendarProviderUi[]): SyncAllHint {
  if (rows.some((r) => r.tone === "needsAttention")) return "needsReconnect";
  if (latestSyncAt(rows)) return "lastSynced";
  if (rows.some((r) => r.tone === "healthy")) return "neverSynced";
  return "noneConnected";
}

export function toneClass(tone: CalendarUiTone): string {
  switch (tone) {
    case "healthy":
      return "text-[var(--brand-500)]";
    case "needsAttention":
      return "text-[var(--warning)]";
    case "notConnected":
      return "text-[var(--text-tertiary)]";
  }
}

/** Query errors from OAuth redirects. Do not show if that provider is already healthy. */
export function oauthCallbackProvider(
  err: string | null | undefined
): "google" | "outlook" | null {
  if (err === "outlook_callback") return "outlook";
  if (err === "google_callback") return "google";
  return null;
}

export function shouldShowOauthCallbackError(
  err: string | null | undefined,
  rows: CalendarProviderUi[]
): boolean {
  if (!err) return false;
  const provider = oauthCallbackProvider(err);
  if (!provider) return true;
  const row = rows.find((r) => r.id === provider);
  return !row || row.tone !== "healthy";
}

export function stripStaleOauthErrorFromUrl(
  err: string | null | undefined,
  rows: CalendarProviderUi[]
): void {
  if (typeof window === "undefined") return;
  if (!oauthCallbackProvider(err)) return;
  if (shouldShowOauthCallbackError(err, rows)) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("error")) return;
  url.searchParams.delete("error");
  const qs = url.searchParams.toString();
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`
  );
}

export function providerTitle(id: CalendarProviderUi["id"]): string {
  switch (id) {
    case "google":
      return "Google Calendar";
    case "outlook":
      return "Outlook / Microsoft 365";
    case "apple":
      return "Apple Calendar";
  }
}
