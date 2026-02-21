import { getApiUrl, getAuthHeaders } from "./api";

export type EventSource = "native" | "google" | "outlook" | "apple" | "booking";

export type Event = {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  source: EventSource;
  externalId?: string;
};

export async function listEvents(params?: { from?: string; to?: string }): Promise<Event[]> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const url = `${getApiUrl()}/events${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

export async function createEvent(data: {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}): Promise<Event> {
  const res = await fetch(`${getApiUrl()}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create event");
  }
  return res.json();
}

export async function updateEvent(
  id: string,
  data: { title?: string; start?: string; end?: string; description?: string; location?: string }
): Promise<Event> {
  const res = await fetch(`${getApiUrl()}/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update event");
  }
  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/events/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete event");
}
