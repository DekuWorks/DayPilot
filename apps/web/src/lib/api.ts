const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getApiUrl() {
  return API_URL;
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
