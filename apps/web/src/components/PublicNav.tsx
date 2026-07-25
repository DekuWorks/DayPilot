"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { buttonClassName } from "@/components/Button";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign In" },
] as const;

export function PublicNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinkClassName = (href: string) =>
    `font-medium transition-colors text-sm md:text-base ${
      pathname === href
        ? "text-[var(--brand-500)]"
        : "text-[var(--text-secondary)] hover:text-[var(--brand-500)]"
    }`;

  return (
    <nav className="section-padding sticky top-0 z-50 border-b border-[var(--border-subtle)] glass-effect">
      <div className="flex items-center justify-between py-4 md:py-6">
        <BrandLogo onClick={() => setIsOpen(false)} />
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={navLinkClassName(link.href)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/signup"
            className={buttonClassName({
              size: "lg",
              className: "inline-flex",
            })}
          >
            Get Started Free
          </Link>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-controls="public-mobile-menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18 18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>
      {isOpen && (
        <div id="public-mobile-menu" className="space-y-2 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-4 py-3 ${navLinkClassName(
                link.href
              )}`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/signup"
            className={buttonClassName({
              size: "lg",
              className: "mt-2 flex w-full",
            })}
            onClick={() => setIsOpen(false)}
          >
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  );
}
