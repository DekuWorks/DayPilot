import type { LucideIcon } from "lucide-react";
import {
  Home,
  Calendar,
  CheckSquare,
  FolderKanban,
  Users,
  StickyNote,
  BarChart3,
  Sparkles,
  Contact,
  Settings,
  Plug,
  CreditCard,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/meetings", label: "Meetings", icon: Users },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/pilot-brief", label: "Pilot Brief", icon: Sparkles, badge: "AI" },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const secondaryNav: NavItem[] = [
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
