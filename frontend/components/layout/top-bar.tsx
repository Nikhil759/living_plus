"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  title: string;
  resident: { hasUnreadNotifications: boolean };
}

export function TopBar({ title, resident }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-opacity duration-premium ease-premium lg:left-64",
        scrolled ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="glass mx-auto flex h-12 max-w-content items-center justify-between px-6 pt-safe">
        <p className="truncate text-headline text-ink">{title}</p>
        <Link
          href="/notifications"
          aria-label={resident.hasUnreadNotifications ? "Notifications (unread)" : "Notifications"}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          {resident.hasUnreadNotifications ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Link>
      </div>
    </header>
  );
}
