"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy Calendar route — Home now hosts Month / Week / Day. */
export default function CalendarRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    router.replace(view ? `/dashboard?view=${encodeURIComponent(view)}` : "/dashboard");
  }, [router]);

  return (
    <p className="text-sm text-[var(--text-secondary)]">Opening Home calendar…</p>
  );
}
