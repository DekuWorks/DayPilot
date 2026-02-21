"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/providers/AuthProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-white/20">
          <Link href="/dashboard" className="text-xl md:text-2xl font-bold gradient-text hover:opacity-80 transition-opacity flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            DayPilot
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button size="md" variant="outline">Dashboard</Button></Link>
            <Link href="/integrations"><Button size="md" variant="outline">Integrations</Button></Link>
            <Link href="/billing"><Button size="md" variant="outline">Billing</Button></Link>
            <Link href="/settings"><Button size="md" variant="outline">Settings</Button></Link>
            {isAuthenticated && user && (
              <>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                  title="Profile settings"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#4FB3B3]/20 flex-shrink-0 flex items-center justify-center border border-[#4FB3B3]/30">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#4FB3B3]">
                        {user.firstName?.[0]}{user.lastName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[#2B3448] font-medium hidden md:inline">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </span>
                </Link>
                <button type="button" onClick={handleLogout} className="text-sm text-[#4FB3B3] hover:underline">
                  Sign out
                </button>
              </>
            )}
          </div>
        </nav>
        <main className="min-h-[calc(100vh-80px)]">{children}</main>
      </div>
    </RequireAuth>
  );
}
