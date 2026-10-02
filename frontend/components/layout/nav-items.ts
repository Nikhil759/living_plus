import { Bot, CalendarDays, Home, LayoutGrid, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/community", label: "Community", icon: Users },
  { href: "/ask-aangan", label: "Ask", icon: Bot, primary: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/more", label: "More", icon: LayoutGrid },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
