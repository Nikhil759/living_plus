import {
  CalendarDays,
  Home,
  LayoutGrid,
  LifeBuoy,
  ShoppingBag,
  Sparkles,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in mobile bottom nav only (centre Ask tab). */
  primary?: boolean;
  /** Desktop sidebar only — omitted from bottom nav. */
  sidebarOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/community", label: "Community", icon: Users },
  { href: "/ask-aangan", label: "Ask", icon: Sparkles, primary: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/amenities", label: "Amenities", icon: Waves, sidebarOnly: true },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, sidebarOnly: true },
  { href: "/help-desk", label: "Help desk", icon: LifeBuoy, sidebarOnly: true },
  { href: "/more", label: "More", icon: LayoutGrid },
];

export function sidebarNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.primary);
}

export function bottomNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.sidebarOnly);
}

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
