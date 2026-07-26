"use client";

/**
 * Gate for (app) routes. Relies on AuthProvider unlocking quickly from the
 * Supabase session so this is a brief check, not a Nest/profile wait.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading } from "@/components/AuthLoading";
import { useAuth } from "@/providers/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    // Lightweight shell placeholder — avoids a blank minute-long hang feel.
    return <AuthLoading label="Checking session…" />;
  }

  if (!isAuthenticated) {
    // Brief pause while replace('/login') runs — never a permanent spinner.
    return <AuthLoading label="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}
