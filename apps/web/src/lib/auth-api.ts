import { getApiUrl, getApiErrorMessage, nestFetch } from "./api";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Public handle (e.g. deku), separate from legal first/last name. */
  username: string | null;
  avatarUrl?: string | null;
  role: string;
};

export async function updateProfile(data: {
  avatarUrl?: string | null;
}): Promise<User> {
  const res = await nestFetch(`${getApiUrl()}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Failed to update profile"));
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
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Login failed"));
  }
  return res.json();
}

export async function signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthResponse> {
  const res = await fetch(`${getApiUrl()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Signup failed"));
  }
  return res.json();
}

export async function refreshTokens(): Promise<AuthResponse> {
  if (typeof window === "undefined") throw new Error("No refresh token");
  const { getNestRefreshToken, nestCredentialsInit, setNestSession } =
    await import("./nest-session");
  const refreshToken = getNestRefreshToken();
  const res = await fetch(
    `${getApiUrl()}/auth/refresh`,
    nestCredentialsInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),
  );
  if (!res.ok) throw new Error("Refresh failed");
  const data = (await res.json()) as AuthResponse;
  setNestSession(data);
  return data;
}

export async function logout(): Promise<void> {
  const { clearNestSession } = await import("./supabase/auth");
  clearNestSession();
}

export async function mergeDuplicateAccount(donorAccessToken: string): Promise<{
  ok: boolean;
  merged: boolean;
  reason?: string;
  donorEmail?: string;
}> {
  const res = await nestFetch(`${getApiUrl()}/auth/merge-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donorAccessToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Could not merge accounts"));
  }
  return res.json();
}

export async function fetchMe(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  const res = await nestFetch(`${getApiUrl()}/auth/me`);
  if (!res.ok) return null;
  return res.json();
}
