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
      <body
        style={{
          margin: 0,
          background: "#0A0B0D",
          color: "#F4F5F7",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ padding: "2rem", maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#9AA3B2", marginBottom: "1.25rem" }}>
            We’ve been notified. Please try again or go back to the home page.
          </p>
          <Link href="/" style={{ color: "#42E85F", fontWeight: 600 }}>
            Back to DayPilot
          </Link>
        </div>
      </body>
    </html>
  );
}
