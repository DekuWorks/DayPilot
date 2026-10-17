"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export function FounderOwnerNav({ current }: { current: "inbox" | "people" }) {
  const { user } = useAuth();
  if (user?.founderHub?.isOwner !== true) return null;

  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium ${
        active
          ? "bg-[var(--brand-500)] text-black"
          : "text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Founder hub owner">
      {item("/settings/founder-inbox", "Messages", current === "inbox")}
      {item("/settings/founder-people", "People", current === "people")}
    </nav>
  );
}
