"use client";

/**
 * AuthProvider — Supabase session is the source of truth for the web app.
 *
 * Performance contract (do not regress):
 * - Unlock UI as soon as a Supabase session exists (map JWT/user metadata).
 * - Enrich in the background: Nest JWT exchange + profiles row. Never block
 *   login/RequireAuth on Nest or a slow profiles fetch.
 * - Never await network work inside onAuthStateChange; Supabase's auth lock
 *   deadlocks signInWithPassword if listeners do async work on that stack.
 *   Defer with setTimeout(0) / fire-and-forget instead.
 */

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
  PROFILE_FETCH_TIMEOUT_MS,
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
  loginWithApple: () => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const mountedRef = useRef(true);
  const enrichGenRef = useRef(0);
  const appliedAccessTokenRef = useRef<string | null>(null);

  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  /** Best-effort profile + Nest JWT — never blocks interactive auth UI. */
  const enrichSession = useCallback(async (session: Session) => {
    const gen = ++enrichGenRef.current;
    const accessToken = session.access_token;

    const profileController = new AbortController();
    const profileTimer = window.setTimeout(
      () => profileController.abort(),
      PROFILE_FETCH_TIMEOUT_MS
    );

    const profilePromise = fetchProfile(
      session.user.id,
      profileController.signal
    )
      .catch(() => null)
      .finally(() => window.clearTimeout(profileTimer));

    // Nest exchange + profile in parallel; both optional.
    const [profile] = await Promise.all([
      profilePromise,
      exchangeNestSession(accessToken),
    ]);

    if (!mountedRef.current || gen !== enrichGenRef.current) return;
    if (appliedAccessTokenRef.current !== accessToken) return;

    if (profile) {
      setState((prev) => {
        if (!prev.isAuthenticated || prev.user?.id !== session.user.id) {
          return prev;
        }
        return {
          ...prev,
          user: mapSupabaseUser(session.user, profile),
        };
      });
    }
  }, []);

  /**
   * Apply session immediately from JWT/user metadata so login + RequireAuth
   * unlock without waiting on Nest or profiles.
   */
  const applySession = useCallback(
    async (session: Session | null, opts?: { enrich?: boolean }) => {
      const enrich = opts?.enrich !== false;
      try {
        if (!session?.user) {
          enrichGenRef.current += 1;
          appliedAccessTokenRef.current = null;
          clearNestSession();
          if (mountedRef.current) {
            setState({ user: null, isLoading: false, isAuthenticated: false });
          }
          return;
        }

        appliedAccessTokenRef.current = session.access_token;
        const quickUser = mapSupabaseUser(session.user, null);
        if (mountedRef.current) {
          setState({
            user: quickUser,
            isLoading: false,
            isAuthenticated: true,
          });
        }

        if (enrich) {
          void enrichSession(session);
        }
      } catch {
        if (!mountedRef.current) return;
        if (session?.user) {
          appliedAccessTokenRef.current = session.access_token;
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
    },
    [enrichSession]
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return () => {
        mountedRef.current = false;
      };
    }

    let settled = false;
    const settle = (session: Session | null) => {
      if (settled) {
        // Later auth events still apply, but don't re-enter loading.
        void applySession(session);
        return;
      }
      settled = true;
      void applySession(session);
    };

    // Supabase holds an auth lock while notifying listeners. Awaiting other
    // Supabase/network work inside onAuthStateChange deadlocks sign-in
    // (signInWithPassword never resolves). Defer async work off that stack.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => settle(session), 0);
    });

    // Eager getSession so marketing/login unlock without waiting solely on
    // INITIAL_SESSION delivery (can lag behind first paint on static export).
    void withTimeout(supabase.auth.getSession(), 4_000, "getSession")
      .then(({ data }) => {
        settle(data.session);
      })
      .catch(() => {
        settle(null);
      });

    const safetyTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    }, 4_000);

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
      // Immediate UI unlock; Nest/profile enrich in background.
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

      // Keep username uniqueness check before unlock; do not wait on Nest.
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

  const loginWithApple = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: origin
          ? `${origin}/auth/callback`
          : "https://www.daypilot.co/auth/callback",
      },
    });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const logout = useCallback(async () => {
    enrichGenRef.current += 1;
    appliedAccessTokenRef.current = null;
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
    loginWithApple,
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
