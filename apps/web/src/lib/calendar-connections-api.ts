import { getApiUrl, getAuthHeaders, getApiErrorMessage } from "./api";

export type CalendarProvider = "google" | "outlook" | "apple";

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

export async function listConnections(): Promise<CalendarConnection[]> {
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
}

export async function getConnectUrl(
  provider: CalendarProvider
): Promise<{ redirectUrl: string }> {
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
}

export async function disconnectConnection(
  id: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${getApiUrl()}/calendar-connections/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Failed to disconnect"));
  }
  return res.json();
}

export async function syncConnection(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${getApiUrl()}/calendar-connections/${id}/sync`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Failed to sync"));
  }
  return res.json();
}

export async function validateConnection(
  id: string
): Promise<ValidateConnectionResult> {
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
}

export function statusLabel(status: ConnectionValidationStatus): string {
  switch (status) {
    case "valid":
      return "Validated";
    case "expired":
      return "Token expired — sync may refresh";
    case "needs_reconnect":
      return "Needs reconnect";
    default:
      return "Not validated yet";
  }
}
