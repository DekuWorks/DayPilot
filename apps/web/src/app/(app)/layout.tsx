import Link from "next/link";
import { Button } from "@/components/Button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-white/20">
        <Link href="/" className="text-xl md:text-2xl font-bold gradient-text hover:opacity-80 transition-opacity flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          DayPilot
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/app/dashboard"><Button size="md" variant="outline">Dashboard</Button></Link>
          <Link href="/app/calendar"><Button size="md" variant="outline">Calendar</Button></Link>
          <Link href="/app/settings"><Button size="md" variant="outline">Settings</Button></Link>
          <Link href="/login" className="text-sm text-[#4FB3B3] hover:underline ml-2">Sign in</Link>
        </div>
      </nav>
      <main className="min-h-[calc(100vh-80px)]">{children}</main>
    </div>
  );
}
