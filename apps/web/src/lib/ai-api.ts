import { getApiErrorMessage, getApiUrl, getAuthHeaders } from "./api";

export type SuggestedEvent = {
  title: string;
  start: string;
  end: string;
  description?: string;
};

export async function suggestSchedule(prompt: string): Promise<{ suggestions: SuggestedEvent[] }> {
  const res = await fetch(`${getApiUrl()}/ai/suggest-schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Could not get schedule suggestions"));
  }
  return res.json();
}

export function formatSuggestedSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
