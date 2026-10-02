"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { LivingWordmark } from "@/components/brand/living-wordmark";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { isNavActive, sidebarNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import type { Resident } from "@/lib/types/home";

export interface SidebarProps {
  resident: Pick<Resident, "name" | "avatarUrl" | "tower" | "flat" | "roles">;
}

export function Sidebar({ resident }: SidebarProps) {
  const pathname = usePathname();
  const links = sidebarNavItems();
  const role = resident.roles[0];

  return (
    <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col lg:flex">
      <div className="px-5 pb-3 pt-8">
        <Link href="/home" aria-label="Living+ home">
          <LivingWordmark />
        </Link>
      </div>

      <div className="px-4 pb-4">
        <Link
          href="/ask-aangan"
          className="flex h-11 items-center gap-2 rounded-full bg-quiet px-3.5 text-callout text-ink-tertiary transition-colors duration-premium ease-premium hover:bg-quiet"
        >
          <Search className="h-5 w-5 text-ink-secondary" strokeWidth={1.5} aria-hidden="true" />
          <span className="flex-1 text-left">Ask Living+…</span>
          <kbd className="rounded-md bg-card px-1.5 py-0.5 text-caption text-ink-tertiary">⌘K</kbd>
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2.5 text-callout transition-colors duration-premium ease-premium",
                    active
                      ? "bg-quiet font-semibold text-primary"
                      : "text-ink-secondary hover:bg-quiet hover:text-ink",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden p-4 lg:block">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-tile p-2 transition-colors duration-premium ease-premium hover:bg-quiet"
        >
          <Avatar name={resident.name} src={resident.avatarUrl} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-headline text-ink">{resident.name}</span>
            <span className="block truncate text-caption text-ink-tertiary">
              {resident.tower} · {resident.flat}
            </span>
            {role ? <Badge className="mt-1">{role}</Badge> : null}
          </span>
        </Link>
      </div>
    </aside>
  );
}
