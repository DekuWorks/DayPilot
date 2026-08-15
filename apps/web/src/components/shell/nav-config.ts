/**
 * Sidebar + command-palette navigation sources.
 * Keep hrefs aligned with app/(app) routes; badges are UI-only hints.
 */

import type { LucideIcon } from "lucide-react";
import {
  Home,
  CheckSquare,
  FolderKanban,
  Users,
  StickyNote,
  BarChart3,
  Sparkles,
  Contact,
  UserRound,
  Settings,
  Plug,
  CreditCard,
  Link2,
  RefreshCw,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/meetings", label: "Meetings", icon: Users },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/pilot-brief", label: "Pilot Brief", icon: Sparkles, badge: "AI" },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/friends", label: "Friends", icon: UserRound },
  { href: "/sync", label: "Sync", icon: RefreshCw },
];

export const secondaryNav: NavItem[] = [
  { href: "/booking-links", label: "Booking links", icon: Link2 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export type WorkspaceItem = {
  id: string;
  name: string;
  color: string;
};

export const defaultWorkspaces: WorkspaceItem[] = [
  { id: "personal", name: "Personal", color: "var(--calendar-personal)" },
  { id: "work", name: "Work", color: "var(--calendar-work)" },
  { id: "side", name: "Side Projects", color: "var(--projects)" },
  { id: "school", name: "School", color: "var(--calendar-school)" },
];
