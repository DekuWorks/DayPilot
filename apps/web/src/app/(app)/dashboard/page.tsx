"use client";

import dynamic from "next/dynamic";

const HomeDashboard = dynamic(
  () =>
    import("@/components/home/HomeDashboard").then((m) => m.HomeDashboard),
  {
    loading: () => (
      <p className="text-[var(--text-secondary)]">Loading dashboard…</p>
    ),
  }
);

export default function DashboardPage() {
  return <HomeDashboard />;
}
