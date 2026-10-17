/**
 * Shared loading, empty, and error line.
 * Plain text on the existing type colours. No spinner library.
 */

import type { ReactNode } from "react";

type StatusTone = "loading" | "empty" | "error";

export function StatusMessage({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "text-sm text-[var(--error)]"
          : "text-sm text-[var(--text-secondary)]"
      }
    >
      {children}
    </p>
  );
}
