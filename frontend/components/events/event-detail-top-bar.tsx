"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { headerIconButtonClass } from "@/components/layout/header-action-button";
import { MAIN_GUTTER } from "@/components/layout/page-container";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { mockResident } from "@/lib/mock/home";
import { cn } from "@/lib/utils";

interface EventDetailTopBarProps {
  title?: string;
}

export function EventDetailTopBar({ title }: EventDetailTopBarProps) {
  const [showTitle, setShowTitle] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const heading = document.getElementById("event-detail-title");
    if (!heading || !title) return;
    const observer = new IntersectionObserver(
      // Only once the heading has scrolled up past the bar, not while it is below the fold.
      ([entry]) => setShowTitle(!entry.isIntersecting && entry.boundingClientRect.top < 72),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, [title]);

  return (
    <header
      className={cn(
        "glass fixed inset-x-0 top-0 z-50 pt-safe transition-shadow duration-premium ease-premium lg:left-sidebar",
        scrolled ? "shadow-[0_1px_0_var(--hairline)]" : null,
      )}
    >
      <div className={cn("flex h-14 items-center gap-3 lg:h-12", MAIN_GUTTER)}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/events"
            className="shrink-0 text-headline font-semibold text-primary"
          >
            ← Events
          </Link>
          {title ? (
            <p
              className={cn(
                "truncate text-headline text-ink transition-opacity duration-premium ease-premium",
                showTitle ? "opacity-100" : "opacity-0",
              )}
            >
              {title}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PwaInstallButton />
          <Link
            href="/notifications"
            aria-label={
              mockResident.hasUnreadNotifications ? "Notifications (unread)" : "Notifications"
            }
            className={cn("relative", headerIconButtonClass())}
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            {mockResident.hasUnreadNotifications ? (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-primary-tint" />
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
