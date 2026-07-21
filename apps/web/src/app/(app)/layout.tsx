"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
