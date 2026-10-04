"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bottomNavItems, isNavActive } from "@/components/layout/nav-items";
import { SaarthiAvatar } from "@/components/saarthi/saarthi-avatar";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";

export function BottomNav() {
  const pathname = usePathname();
  const saarthi = useSaarthi();

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-2xl pb-safe lg:hidden"
    >
      <ul className="flex h-16 items-center justify-around px-2">
        {bottomNavItems().map(({ href, label, icon: Icon, primary }) => {
          if (primary) {
            return (
              <li key={href}>
                <button
                  type="button"
                  onClick={() => saarthi.open()}
                  className="flex h-12 min-w-14 flex-col items-center justify-center gap-0.5 text-ink-secondary"
                >
                  <SaarthiAvatar size="sm" state={saarthi.avatarState} />
                  <span className="text-caption">{label}</span>
                </button>
              </li>
            );
          }
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 min-w-14 flex-col items-center justify-center gap-0.5",
                  active ? "font-semibold text-primary" : "text-ink-secondary",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-caption">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
