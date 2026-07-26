"use client";

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
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    // Brief pause while replace('/login') runs — never a permanent spinner.
    return <AuthLoading label="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}
