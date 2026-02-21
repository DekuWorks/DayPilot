import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="container-width section-padding py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-[#2B3448] mb-2">Dashboard</h1>
      <p className="text-[#4f4f4f] mb-6">Your calendar overview and quick actions. Full dashboard (calendar, tasks, insights) will be wired after Phase 6 auth.</p>
      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl">
        <p className="text-[#4f4f4f] mb-4">Sign in to see your events and tasks.</p>
        <Link href="/login" className="text-[#4FB3B3] font-medium hover:underline">Sign in →</Link>
      </div>
    </div>
  );
}
