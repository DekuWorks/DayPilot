"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exchangeNestSession } from "@/lib/supabase/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        let accessToken: string | null = null;

        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          accessToken = data.session?.access_token ?? null;
        } else {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!session) throw new Error("No session returned from provider");
          accessToken = session.access_token;
        }

        // Nest JWT bridge is optional — never block redirect on cold API /
        // localhost IPv6 hangs (can take ~60s without AbortSignal).
        if (accessToken) {
          void exchangeNestSession(accessToken);
        }

        let next = url.searchParams.get("next");
        if (!next) {
          try {
            next = sessionStorage.getItem("daypilot_auth_next");
            sessionStorage.removeItem("daypilot_auth_next");
          } catch {
            next = null;
          }
        }
        const safeNext =
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/dashboard";
        router.replace(safeNext);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auth callback failed");
        setTimeout(() => router.replace("/login"), 2500);
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background-primary)] text-[var(--text-secondary)]">
      {error ? (
        <p className="text-[var(--error)] px-4 text-center">{error}</p>
      ) : (
        <p>Signing you in…</p>
      )}
    </div>
  );
}
