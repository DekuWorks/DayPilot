"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { User } from "@/lib/auth-api";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  clearNestSession,
  exchangeNestSession,
  fetchProfile,
  mapSupabaseUser,
  normalizeUsername,
} from "@/lib/supabase/auth";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    username?: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function sessionToUser(session: Session): Promise<User> {
  let profile = null;
  try {
    profile = await withTimeout(fetchProfile(session.user.id), 8_000, "Profile fetch");
  } catch {
    // Profile is best-effort; auth should still succeed.
  }
  return mapSupabaseUser(session.user, profile);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const mountedRef = useRef(true);

  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const applySession = useCallback(async (session: Session | null) => {
    try {
      if (!session?.user) {
        clearNestSession();
        if (mountedRef.current) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
        return;
      }

      const user = await sessionToUser(session);
      // Nest exchange is best-effort; Supabase session is source of truth.
      try {
        await withTimeout(
          exchangeNestSession(session.access_token),
          8_000,
          "Session exchange"
        );
      } catch {
        // Ignore — Nest JWT bridge is optional for Supabase-authenticated pages.
      }
      if (mountedRef.current) {
        setState({ user, isLoading: false, isAuthenticated: true });
      }
    } catch {
      if (!mountedRef.current) return;
      // Prefer a minimal authenticated user over infinite Loading.
      if (session?.user) {
        setState({
          user: mapSupabaseUser(session.user, null),
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      }
      clearNestSession();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return () => {
        mountedRef.current = false;
      };
    }

    // Supabase holds an auth lock while notifying listeners. Awaiting other
    // Supabase/network work inside onAuthStateChange deadlocks sign-in
    // (signInWithPassword never resolves). Defer async work off that stack.
    let gotAuthEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      gotAuthEvent = true;
      setTimeout(() => {
        void applySession(session);
      }, 0);
    });

    const safetyTimer = window.setTimeout(() => {
      if (!gotAuthEvent) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    }, 10_000);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [supabase, applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.user || !data.session) throw new Error("Login failed");
      // Apply immediately so callers can navigate after await without racing
      // the deferred onAuthStateChange handler.
      await applySession(data.session);
    },
    [supabase, applySession]
  );

  const loginWithMagicLink = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: origin
            ? `${origin}/auth/callback`
            : "https://www.daypilot.co/auth/callback",
          shouldCreateUser: true,
        },
      });
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      username?: string
    ) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const handle = username ? normalizeUsername(username) : "";
      const displayName = `${firstName} ${lastName}`.trim();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: origin
            ? `${origin}/auth/callback`
            : "https://www.daypilot.co/auth/callback",
          data: {
            first_name: firstName,
            last_name: lastName,
            username: handle || undefined,
            full_name: displayName,
            name: displayName,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Signup failed");

      // If email confirmation is required, session may be null
      if (!data.session) {
        throw new Error(
          "Check your email to confirm your account, then sign in."
        );
      }

      // Best-effort profile update (trigger may have already inserted)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: displayName,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName || null,
          username: handle || null,
        })
        .eq("id", data.user.id);
      if (profileError?.code === "23505") {
        throw new Error("That username is already taken");
      }

      await applySession(data.session);
    },
    [supabase, applySession]
  );

  const loginWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: origin
          ? `${origin}/auth/callback`
          : "https://www.daypilot.co/auth/callback",
      },
    });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    clearNestSession();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.user) throw new Error("Refresh failed");
    await applySession(data.session);
  }, [supabase, applySession]);

  const value: AuthContextValue = {
    ...state,
    login,
    loginWithMagicLink,
    signup,
    loginWithGoogle,
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
