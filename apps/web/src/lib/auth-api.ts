import { getApiUrl, getAuthHeaders } from "./api";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: string;
};

export async function updateProfile(data: { avatarUrl?: string | null }): Promise<User> {
  const res = await fetch(`${getApiUrl()}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update profile");
  }
  return res.json();
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

export async function signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthResponse> {
  const res = await fetch(`${getApiUrl()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Signup failed");
  }
  return res.json();
}

export async function refreshTokens(): Promise<AuthResponse> {
  if (typeof window === "undefined") throw new Error("No refresh token");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");
  const res = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  return res.json();
}

export async function logout(): Promise<void> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
  if (refreshToken) {
    try {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }
}

export async function fetchMe(): Promise<User | null> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return null;
  const res = await fetch(`${getApiUrl()}/auth/me`, { headers });
  if (!res.ok) return null;
  return res.json();
}
