"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-white/20">
        <Link href="/" className="text-xl md:text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
          DayPilot
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/features" className="text-[#2B3448] hover:text-[#4FB3B3] font-medium text-sm md:text-base">Features</Link>
          <Link href="/pricing" className="text-[#2B3448] hover:text-[#4FB3B3] font-medium text-sm md:text-base">Pricing</Link>
          <Link href="/login" className="text-[#4FB3B3] font-medium text-sm md:text-base">Sign In</Link>
          <Link href="/signup" className="text-[#2B3448] hover:text-[#4FB3B3] font-medium text-sm md:text-base">Get Started</Link>
        </div>
      </nav>
      <section className="container-width section-padding py-16 md:py-24 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-[#2B3448] mb-4">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#2B3448] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#2B3448] mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-11 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f4f4f] hover:text-[#4FB3B3] transition-colors"
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
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-[#4f4f4f] text-sm">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-[#4FB3B3] font-medium hover:underline">Sign up</Link>
        </p>
        <Link href="/" className="inline-block mt-4 text-[#4FB3B3] font-medium hover:underline">← Back to home</Link>
      </section>
    </div>
  );
}
