"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { MAIN_GUTTER } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { formatHomeCaption, getGreeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Resident } from "@/lib/types/home";

const BANNER_HEIGHT = "h-[180px] lg:h-[220px]";
const HOME_BANNER_SRC = "/home-banner.png";

/** Aligns with the main column; bottom / top inset uses 32px (p-8). */
const BANNER_PAD_X = "px-4 sm:px-5 lg:px-8 xl:px-10 xl:pr-12";
const BANNER_PAD_BOTTOM = "pb-8";

export type HomeBannerResident = Pick<
  Resident,
  "name" | "avatarUrl" | "society" | "hasUnreadNotifications"
>;

function BannerCopy({
  resident,
  variant,
  greetingRef,
}: {
  resident: HomeBannerResident;
  variant: "light" | "dark";
  greetingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const first = resident.name.split(" ")[0] ?? resident.name;
  const light = variant === "light";

  return (
    <div className="max-w-[min(100%,28rem)] space-y-1">
      <p
        className={cn(
          "text-caption",
          light ? "text-white/80" : "text-ink-secondary",
        )}
      >
        {formatHomeCaption(resident.society)}
      </p>
      <h1
        ref={greetingRef}
        className={cn(
          "text-[1.75rem] font-semibold leading-[2.125rem] tracking-[-0.025em] sm:text-large-title",
          light && "text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]",
          !light && "text-ink",
        )}
      >
        {getGreeting()}, {first}
      </h1>
    </div>
  );
}

function BannerActions({ resident, frosted }: { resident: HomeBannerResident; frosted: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Link
        href="/notifications"
        aria-label={
          resident.hasUnreadNotifications ? "Notifications (unread)" : "Notifications"
        }
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-premium ease-premium",
          frosted
            ? "border border-white/30 bg-white/[0.22] text-white backdrop-blur-[16px] backdrop-saturate-[180]"
            : "text-ink-secondary hover:bg-quiet",
        )}
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        {resident.hasUnreadNotifications ? (
          <span
            className={cn(
              "absolute right-2 top-2 h-2 w-2 rounded-full bg-primary",
              frosted ? "ring-2 ring-white/40" : "ring-2 ring-card",
            )}
          />
        ) : null}
      </Link>
      <Link href="/profile" aria-label="Profile" className="rounded-full">
        <Avatar
          name={resident.name}
          src={resident.avatarUrl}
          size="sm"
          className={cn(frosted && "ring-2 ring-white")}
        />
      </Link>
    </div>
  );
}

/** Static placeholder while the route or hero image is loading. */
export function HomeBannerFallback({ resident }: { resident: HomeBannerResident }) {
  const greetingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section className={cn("relative w-full bg-quiet", BANNER_HEIGHT)} aria-label="Home">
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex justify-end pt-[calc(env(safe-area-inset-top,0px)+12px)]",
          BANNER_PAD_X,
        )}
      >
        <BannerActions resident={resident} frosted={false} />
      </div>
      <div className={cn("absolute inset-x-0 bottom-0", BANNER_PAD_X, BANNER_PAD_BOTTOM)}>
        <BannerCopy resident={resident} variant="dark" greetingRef={greetingRef} />
      </div>
    </section>
  );
}

export function HomePhotoBanner({ resident }: { resident: HomeBannerResident }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const greetingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = greetingRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting);
      },
      { root: null, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [imageLoaded]);

  return (
    <>
      <header
        className={cn(
          "glass fixed inset-x-0 top-0 z-50 pt-safe transition-opacity duration-200 ease-premium lg:left-sidebar",
          "motion-reduce:transition-none",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!collapsed}
      >
        <div className={cn("flex h-14 items-center justify-between gap-3", MAIN_GUTTER)}>
          <p className="truncate text-headline text-ink">Home</p>
          <BannerActions resident={resident} frosted={false} />
        </div>
      </header>

      <section className={cn("relative w-full overflow-hidden", BANNER_HEIGHT)} aria-label="Home">
        <div
          className={cn(
            "absolute inset-0 bg-quiet transition-opacity duration-premium ease-premium motion-reduce:transition-none",
            imageLoaded ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          aria-hidden={imageLoaded}
        />

        <Image
          src={HOME_BANNER_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover object-[center_60%] saturate-[0.9] transition-opacity duration-premium ease-premium motion-reduce:transition-none",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImageLoaded(true)}
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 60%), linear-gradient(to bottom, transparent 40%, var(--bg) 100%)",
          }}
          aria-hidden="true"
        />

        <div
          className={cn(
            "absolute inset-x-0 top-0 flex justify-end pt-[calc(env(safe-area-inset-top,0px)+12px)]",
            BANNER_PAD_X,
          )}
        >
          <BannerActions resident={resident} frosted={imageLoaded} />
        </div>

        <div className={cn("absolute inset-x-0 bottom-0", BANNER_PAD_X, BANNER_PAD_BOTTOM)}>
          <BannerCopy
            resident={resident}
            variant={imageLoaded ? "light" : "dark"}
            greetingRef={greetingRef}
          />
        </div>
      </section>
    </>
  );
}
