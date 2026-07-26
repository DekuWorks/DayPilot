import { Suspense } from "react";
import { PublicBookPage } from "../PublicBookPage";

/** Placeholder so production `output: "export"` can emit this segment. */
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default function BookSlugPage() {
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
