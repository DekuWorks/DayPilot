import { getApiUrl, getAuthHeaders } from "./api";

export type CalendarProvider = "google" | "outlook" | "apple";

export type CalendarConnection = {
  id: string;
  provider: CalendarProvider;
  email: string;
  syncedAt: string | null;
  connectedAt: string;
};

export async function listConnections(): Promise<CalendarConnection[]> {
  const res = await fetch(`${getApiUrl()}/calendar-connections`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load connections");
  return res.json();
}

export async function getConnectUrl(provider: CalendarProvider): Promise<{ redirectUrl: string }> {
  const res = await fetch(`${getApiUrl()}/calendar-connections/${provider}/connect`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to get connect URL");
  }
  return res.json();
}

export async function disconnectConnection(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${getApiUrl()}/calendar-connections/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to disconnect");
  return res.json();
}

export async function syncConnection(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${getApiUrl()}/calendar-connections/${id}/sync`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to sync");
  return res.json();
}
