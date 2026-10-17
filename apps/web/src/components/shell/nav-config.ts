/**
 * Sidebar + command-palette navigation sources.
 * Keep hrefs aligned with app/(app) routes; badges are UI-only hints.
 */

import type { LucideIcon } from "lucide-react";
import {
  Home,
  CalendarDays,
  Crown,
  CheckSquare,
  FolderKanban,
  Users,
  StickyNote,
  BarChart3,
  Sparkles,
  Timer,
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
  /** Path prefixes that belong to a different item and must not highlight this one. */
  excludePrefixes?: string[];
};

/** Mockup order: Today, Calendar, Tasks, Booking, Insights. Founders Hub follows when authorised. */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/booking-links", label: "Booking", icon: Link2 },
  { href: "/insights", label: "Insights", icon: BarChart3 },
];

/** Everything else that already has a route. Grouped under "More" in the sidebar. */
export const moreNav: NavItem[] = [
  { href: "/pilot-brief", label: "Pilot Brief", icon: Sparkles, badge: "AI" },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/meetings", label: "Meetings", icon: Users },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/friends", label: "Friends", icon: UserRound },
  { href: "/sync", label: "Sync", icon: RefreshCw },
];

/** Pinned to the bottom of the sidebar. There is no help route, so no Help item. */
export const footerNav: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    excludePrefixes: ["/settings/founder"],
  },
];

export const secondaryNav: NavItem[] = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

/**
 * Founders Hub entry for the current account, or null.
 * Owner: private inbox. Founding member: member hub. Anyone else sees nothing.
 */
export function founderHubNavItem(
  hub:
    | { isOwner?: boolean; isFoundingMember?: boolean; unreadCount?: number }
    | null
    | undefined,
): NavItem | null {
  if (!hub) return null;
  const owner = hub.isOwner === true;
  const member = hub.isFoundingMember === true;
  if (!owner && !member) return null;
  const unread = owner && (hub.unreadCount ?? 0) > 0 ? hub.unreadCount : 0;
  return {
    href: owner ? "/settings/founder-inbox" : "/settings/founder-hub",
    label: "Founders Hub",
    icon: Crown,
    badge: unread ? String(unread) : undefined,
    excludePrefixes: [],
  };
}

export type WorkspaceItem = {
  id: string;
  name: string;
  color: string;
};

export const defaultWorkspaces: WorkspaceItem[] = [
  { id: "personal", name: "Personal", color: "#F97316" },
  { id: "work", name: "Work", color: "#3B82F6" },
  { id: "side", name: "Side Projects", color: "#7C3AED" },
  { id: "school", name: "School", color: "#C084FC" },
];
