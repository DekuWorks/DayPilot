"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export const THEME_STORAGE_KEY = "daypilot-theme";

export type DayPilotTheme = "dark" | "light";

type ThemeContextValue = {
  theme: DayPilotTheme;
  setTheme: (theme: DayPilotTheme) => void;
  setLight: (light: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function readStoredTheme(): DayPilotTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: DayPilotTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<DayPilotTheme>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const persist = useCallback(
    async (next: DayPilotTheme) => {
      setThemeState(next);
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore quota / private mode
      }
      if (!user || !isSupabaseConfigured()) return;
      try {
        const supabase = createClient();
        await supabase.from("preferences").upsert({
          user_id: user.id,
          theme: next,
        });
      } catch {
        // localStorage still applies
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme: persist,
      setLight: (light: boolean) => persist(light ? "light" : "dark"),
    }),
    [theme, persist],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
