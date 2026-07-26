import { Suspense } from "react";
import { PublicBookPage } from "./PublicBookPage";

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
