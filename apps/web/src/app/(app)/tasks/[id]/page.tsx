import { Suspense } from "react";
import { TaskDetailPage } from "./TaskDetailPage";

/** Placeholder so `output: "export"` can emit this dynamic segment. */
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-[var(--text-secondary)]">Loading…</p>}>
      <TaskDetailPage />
    </Suspense>
  );
}
