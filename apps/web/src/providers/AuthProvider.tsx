"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@/lib/auth-api";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  clearNestSession,
  exchangeNestSession,
  fetchProfile,
  mapSupabaseUser,
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
    lastName: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const hydrateFromSession = useCallback(async () => {
    if (!supabase) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      clearNestSession();
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    const profile = await fetchProfile(session.user.id);
    const user = mapSupabaseUser(session.user, profile);
    await exchangeNestSession(session.access_token);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(() => hydrateFromSession());
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session?.user) {
          clearNestSession();
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }
        const profile = await fetchProfile(session.user.id);
        const user = mapSupabaseUser(session.user, profile);
        await exchangeNestSession(session.access_token);
        setState({ user, isLoading: false, isAuthenticated: true });
      })();
    });

    return () => subscription.unsubscribe();
  }, [supabase, hydrateFromSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.user || !data.session) throw new Error("Login failed");
      const profile = await fetchProfile(data.user.id);
      const user = mapSupabaseUser(data.user, profile);
      await exchangeNestSession(data.session.access_token);
      setState({ user, isLoading: false, isAuthenticated: true });
    },
    [supabase]
  );

  const loginWithMagicLink = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
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
      lastName: string
    ) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const displayName = `${firstName} ${lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
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

      // Best-effort profile update
      await supabase
        .from("profiles")
        .update({
          name: displayName,
          display_name: displayName,
        })
        .eq("id", data.user.id);

      const profile = await fetchProfile(data.user.id);
      const user = mapSupabaseUser(data.user, profile);
      await exchangeNestSession(data.session.access_token);
      setState({ user, isLoading: false, isAuthenticated: true });
    },
    [supabase]
  );

  const loginWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
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
    const profile = await fetchProfile(data.session.user.id);
    const user = mapSupabaseUser(data.session.user, profile);
    await exchangeNestSession(data.session.access_token);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, [supabase]);

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
