"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { LivingWordmark } from "@/components/brand/living-wordmark";
import { headerIconButtonClass } from "@/components/layout/header-action-button";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { MAIN_GUTTER } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  title: string;
  resident: { hasUnreadNotifications: boolean };
}

export function TopBar({ title, resident }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const isHome = title === "Home";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "glass fixed inset-x-0 top-0 z-50 pt-safe transition-shadow duration-premium ease-premium lg:left-sidebar",
        scrolled ? "shadow-[0_1px_0_var(--hairline)]" : null,
      )}
    >
      <div className={cn("flex h-14 items-center gap-3 lg:h-12", MAIN_GUTTER)}>
        <div className="min-w-0 flex-1">
          {isHome ? (
            <>
              <Link href="/home" className="inline-flex lg:hidden" aria-label="Living+ home">
                <LivingWordmark />
              </Link>
              <p
                className={cn(
                  "hidden truncate text-headline text-ink transition-opacity duration-premium ease-premium lg:block",
                  scrolled ? "opacity-100" : "opacity-0",
                )}
              >
                {title}
              </p>
            </>
          ) : (
            <p className="truncate text-headline text-ink">{title}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <PwaInstallButton />
          <Link
            href="/notifications"
            aria-label={
              resident.hasUnreadNotifications ? "Notifications (unread)" : "Notifications"
            }
            className={cn("relative", headerIconButtonClass())}
          >
          <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          {resident.hasUnreadNotifications ? (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-primary-tint" />
          ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
