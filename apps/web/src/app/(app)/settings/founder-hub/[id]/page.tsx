import { Suspense } from "react";
import { FounderSuggestionPage } from "./FounderSuggestionPage";

/** Placeholder so production `output: "export"` can emit this segment. */
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      }
    >
      <FounderSuggestionPage />
    </Suspense>
  );
}
