"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && error) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "32rem" }}>
          <h1>Something went wrong</h1>
          <p>We’ve been notified. Please try again or go back to the home page.</p>
          <Link href="/" style={{ color: "#4FB3B3", fontWeight: 600 }}>Back to DayPilot</Link>
        </div>
      </body>
    </html>
  );
}
