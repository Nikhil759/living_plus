"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { isNavActive, NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import type { Resident } from "@/lib/types/home";

export interface SidebarProps {
  resident: Pick<Resident, "name" | "avatarUrl" | "society" | "tower" | "flat">;
}

/** Desktop navigation (lg+). Mobile uses <BottomNav>. */
export function Sidebar({ resident }: SidebarProps) {
  const pathname = usePathname();
  const cta = NAV_ITEMS.find((item) => item.primary);
  const links = NAV_ITEMS.filter((item) => !item.primary);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant/40 bg-surface-container-low lg:flex">
      <div className="flex h-20 items-center px-6">
        <Link href="/home" aria-label="Living+ home">
          <Image
            src="/brand/wordmark.png"
            alt="Living+"
            width={80}
            height={32}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="px-4 pb-2">
        {cta ? (
          <Link
            href={cta.href}
            className={buttonVariants({
              size: "md",
              className: "w-full justify-center py-3 text-label-lg shadow-fab",
            })}
          >
            <cta.icon className="h-5 w-5" aria-hidden="true" />
            Ask Aangan
          </Link>
        ) : null}
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-label-lg transition-colors",
                    active
                      ? "bg-primary-fixed text-on-primary-fixed-variant"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-outline-variant/40 p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container-high"
        >
          <Avatar name={resident.name} src={resident.avatarUrl} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-label-lg text-on-surface">{resident.name}</span>
            <span className="block truncate text-body-sm text-on-surface-variant">
              {resident.tower}, Flat {resident.flat}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
