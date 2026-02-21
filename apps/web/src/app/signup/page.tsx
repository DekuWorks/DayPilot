import Link from "next/link";

export default function SignupPage() {
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
        <p className="text-[#4f4f4f] mb-6">Auth (Phase 6) will add signup form and API integration.</p>
        <Link href="/" className="text-[#4FB3B3] font-medium hover:underline">← Back to home</Link>
      </section>
    </div>
  );
}
