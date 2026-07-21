"use client";

"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  Plus,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSidebarStore } from "@/stores/sidebar-store";
import { BrandLogo } from "@/components/BrandLogo";
import {
  defaultWorkspaces,
  primaryNav,
  secondaryNav,
} from "./nav-config";

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-nav)] font-medium transition-colors ${
        active
          ? "bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-[var(--brand-500)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="rounded-md bg-[color-mix(in_srgb,var(--brand-500)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-500)]">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } =
    useSidebarStore();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "Account";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const closeMobile = () => setMobileOpen(false);

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-b border-[var(--border-subtle)] px-4 py-4 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        {collapsed ? (
          <BrandLogo
            href="/dashboard"
            showWordmark={false}
            size={32}
            onClick={closeMobile}
          />
        ) : (
          <BrandLogo
            href="/dashboard"
            className="min-w-0"
            onClick={closeMobile}
          />
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
        aria-label="Main"
      >
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}

        {!collapsed && (
          <div className="pt-5 pb-2 px-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <span>Workspaces</span>
              <button
                type="button"
                className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--brand-500)]"
                aria-label="Add workspace"
                title="Add workspace (coming soon)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className={`${collapsed ? "space-y-1" : "space-y-0.5"}`}>
          {defaultWorkspaces.map((ws, index) => (
            <button
              key={ws.id}
              type="button"
              title={collapsed ? ws.name : undefined}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-[var(--text-nav)] transition-colors ${
                index === 0
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: ws.color }}
                aria-hidden
              />
              {!collapsed && <span className="truncate font-medium">{ws.name}</span>}
            </button>
          ))}
        </div>

        {!collapsed && (
          <div className="pt-4 space-y-0.5 border-t border-[var(--border-subtle)] mt-4">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
            ))}
          </div>
        )}
        {collapsed &&
          secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-2 space-y-1">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>

        <div
          className={`flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-[var(--brand-500)]">
                {initials}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {displayName}
              </p>
              <p className="truncate text-xs text-[var(--text-tertiary)]">
                {user?.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--error)]"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden md:flex shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] transition-[width] duration-200 ease-[var(--ease-out)] ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
        aria-label="Sidebar"
      >
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      )}
    </>
  );
}
