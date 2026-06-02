const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const token = localStorage.getItem("accessToken");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
