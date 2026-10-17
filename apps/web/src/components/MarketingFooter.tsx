import Link from "next/link";
import { AppStoreBadge } from "@/components/AppStoreBadge";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)]">
      <div className="container-width section-padding flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            DayPilot plans today from your calendar and tasks.
          </p>
          <AppStoreBadge />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/features"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-500)]"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-500)]"
          >
            Pricing
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-500)]"
          >
            Privacy
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-500)]"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
