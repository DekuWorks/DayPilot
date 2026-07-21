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

        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data.session) {
            await exchangeNestSession(data.session.access_token);
          }
        } else {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!session) throw new Error("No session returned from provider");
          await exchangeNestSession(session.access_token);
        }

        router.replace("/dashboard");
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
