"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { normalizeUsername } from "@/lib/supabase/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const handle = normalizeUsername(username);
    if (!trimmedFirst || !trimmedLast) {
      setError("First name and last name are required");
      return;
    }
    if (!handle || handle.length < 3) {
      setError("Username must be at least 3 characters (a-z, 0-9, _)");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, trimmedFirst, trimmedLast, handle);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setError(
        msg.includes("already exists")
          ? "An account with this email already exists. Sign in instead."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-[var(--border-subtle)]">
        <BrandLogo />
        <div className="hidden md:flex items-center gap-6">
          <Link href="/features" className="text-[var(--text-primary)] hover:text-[var(--brand-500)] font-medium text-sm md:text-base">Features</Link>
          <Link href="/pricing" className="text-[var(--text-primary)] hover:text-[var(--brand-500)] font-medium text-sm md:text-base">Pricing</Link>
          <Link href="/login" className="text-[var(--text-primary)] hover:text-[var(--brand-500)] font-medium text-sm md:text-base">Sign In</Link>
          <Link href="/signup" className="text-[var(--brand-500)] font-medium text-sm md:text-base">Get Started</Link>
        </div>
      </nav>
      <section className="container-width section-padding py-16 md:py-24 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Get started</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-[var(--error)] text-sm bg-[color-mix(in_srgb,var(--error)_12%,transparent)] border border-[color-mix(in_srgb,var(--error)_35%,transparent)] rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-primary)] mb-1">First name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)] outline-none"
                placeholder="Marcus"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Last name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)] outline-none"
                placeholder="Brown"
              />
            </div>
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Username</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                required
                minLength={3}
                autoComplete="username"
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)] outline-none"
                placeholder="deku"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Public handle — greetings use your first name
            </p>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)] outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Password (min 8 characters)</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 pr-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-500)] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          <span className="text-xs text-[var(--text-tertiary)]">or</span>
          <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={googleLoading}
          onClick={async () => {
            setError("");
            setGoogleLoading(true);
            try {
              await loginWithGoogle();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Google sign-in failed"
              );
              setGoogleLoading(false);
            }
          }}
        >
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </Button>
        <p className="mt-6 text-[var(--text-secondary)] text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--brand-500)] font-medium hover:underline">Sign in</Link>
        </p>
        <Link href="/" className="inline-block mt-4 text-[var(--brand-500)] font-medium hover:underline">← Back to home</Link>
      </section>
    </div>
  );
}
