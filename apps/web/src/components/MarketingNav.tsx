"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";

type MarketingNavProps = {
  ctaLabel?: string;
  ctaHref?: string;
  /** When true, CTA is a Button; otherwise a text link (auth pages). */
  ctaAsButton?: boolean;
};

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign In" },
] as const;

export function MarketingNav({
  ctaLabel = "Get Started",
  ctaHref = "/signup",
  ctaAsButton = true,
}: MarketingNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function linkClass(href: string) {
    const active = pathname === href;
    return active
      ? "text-[var(--brand-500)] font-medium text-sm md:text-base"
      : "text-[var(--text-secondary)] hover:text-[var(--brand-500)] font-medium transition-colors text-sm md:text-base";
  }

  return (
    <nav className="section-padding py-4 md:py-6 sticky top-0 z-50 glass-effect border-b border-[var(--border-subtle)]">
      <div className="flex justify-between items-center">
        <BrandLogo />
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          {ctaAsButton ? (
            <Link href={ctaHref} className="inline-block">
              <Button size="lg">{ctaLabel}</Button>
            </Link>
          ) : (
            <Link href={ctaHref} className={linkClass(ctaHref)}>
              {ctaLabel}
            </Link>
          )}
        </div>
        <button
          type="button"
          className="md:hidden p-2 text-[var(--text-primary)]"
          aria-label={open ? "Close menu" : "Menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden mt-4 pb-2 flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-[var(--radius-md)] px-3 py-3 ${linkClass(l.href)}`}
            >
              {l.label}
            </Link>
          ))}
          {ctaAsButton ? (
            <Link href={ctaHref} className="mt-2 inline-block">
              <Button size="lg" className="w-full">
                {ctaLabel}
              </Button>
            </Link>
          ) : (
            <Link
              href={ctaHref}
              className={`rounded-[var(--radius-md)] px-3 py-3 ${linkClass(ctaHref)}`}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
