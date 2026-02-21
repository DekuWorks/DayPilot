"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@/lib/auth-api";
import * as authApi from "@/lib/auth-api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

function persistAuth(data: authApi.AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
}

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.refreshTokens();
      persistAuth(data);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      clearAuth();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const loadUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEYS.user);
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (stored && accessToken) {
      try {
        const user = await authApi.fetchMe();
        if (user) {
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
      } catch {
        // try refresh
      }
      try {
        await refresh();
        return;
      } catch {
        clearAuth();
      }
    }
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [refresh]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      persistAuth(data);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    []
  );

  const signup = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      const data = await authApi.signup(email, password, firstName, lastName);
      persistAuth(data);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    clearAuth();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    signup,
    logout,
    refresh,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
