import { getApiUrl, getAuthHeaders } from "./api";

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
    throw new Error(err.message ?? "Failed to get suggestions");
  }
  return res.json();
}
