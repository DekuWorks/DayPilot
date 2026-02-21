"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, name || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
          <Link href="/login" className="text-[#2B3448] hover:text-[#4FB3B3] font-medium text-sm md:text-base">Sign In</Link>
          <Link href="/signup" className="text-[#4FB3B3] font-medium text-sm md:text-base">Get Started</Link>
        </div>
      </nav>
      <section className="container-width section-padding py-16 md:py-24 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-[#2B3448] mb-4">Get started</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#2B3448] mb-1">Name (optional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
              placeholder="Your name"
            />
          </div>
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
            <label htmlFor="password" className="block text-sm font-medium text-[#2B3448] mb-1">Password (min 8 characters)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-[#4f4f4f] text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#4FB3B3] font-medium hover:underline">Sign in</Link>
        </p>
        <Link href="/" className="inline-block mt-4 text-[#4FB3B3] font-medium hover:underline">← Back to home</Link>
      </section>
    </div>
  );
}
