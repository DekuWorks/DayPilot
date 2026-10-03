import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicBookPage } from "./PublicBookPage";

export const metadata: Metadata = {
  title: "Book a time",
  description:
    "Pick a time on a DayPilot booking page. No account or app required.",
};

export default function BookIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--text-secondary)]">Loading…</p>
        </div>
      }
    >
      <PublicBookPage />
    </Suspense>
  );
}
