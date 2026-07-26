"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { MarketingNav } from "@/components/MarketingNav";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: origin
          ? `${origin}/auth/callback`
          : "https://www.daypilot.co/auth/callback",
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <MarketingNav ctaAsButton={false} ctaLabel="Sign In" ctaHref="/login" />
      <section className="container-width section-padding py-16 md:py-24 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Reset password
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          We&apos;ll email you a link to choose a new password.
        </p>
        {sent ? (
          <div className="rounded-xl border border-[var(--brand-500)] bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] p-4 text-sm text-[var(--text-primary)]">
            Check your email for a reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-[var(--error)]">{error}</p>}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
