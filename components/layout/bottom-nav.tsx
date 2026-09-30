"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "@/components/layout/nav-items";

/** Mobile / tablet navigation. Hidden on desktop, where <Sidebar> takes over. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl bg-surface/90 pb-safe shadow-bar-top backdrop-blur-xl lg:hidden"
    >
      <ul className="flex h-16 items-center justify-around px-space-xs">
        {NAV_ITEMS.map(({ href, label, icon: Icon, primary }) => {
          const active = isNavActive(pathname, href);

          if (primary) {
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="-mt-4 flex h-12 min-w-14 flex-col items-center justify-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition-transform active:scale-95">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="mt-1 text-label-sm text-on-surface-variant">{label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 min-w-14 flex-col items-center justify-center transition-colors",
                  active ? "font-bold text-primary" : "text-on-surface-variant hover:text-primary",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span className="mt-0.5 text-label-sm">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
