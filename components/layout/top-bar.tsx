import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Resident } from "@/lib/types/home";

export interface TopBarProps {
  title: string;
  resident: Pick<Resident, "name" | "avatarUrl" | "society" | "tower" | "hasUnreadNotifications">;
}

function NotificationsLink({ unread }: { unread: boolean }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? "Notifications (unread)" : "Notifications"}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
    >
      <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
      {unread ? (
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
      ) : null}
    </Link>
  );
}

/**
 * Mobile: fixed app bar with wordmark.
 * Desktop (lg+): in-flow page header; the wordmark lives in <Sidebar>.
 */
export function TopBar({ title, resident }: TopBarProps) {
  return (
    <>
      {/* Mobile / tablet */}
      <header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-2xl bg-surface/90 pt-safe shadow-bar backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-space-sm px-margin">
          <div className="flex min-w-0 flex-1 items-center gap-space-sm">
            <Image
              src="/brand/wordmark.png"
              alt="Living+"
              width={64}
              height={32}
              priority
              className="h-8 w-auto shrink-0 object-contain"
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label-sm uppercase tracking-wider text-on-surface-variant">
                {resident.society} · {resident.tower}
              </span>
              <span className="truncate text-headline-sm text-on-surface">{title}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-space-xs">
            <NotificationsLink unread={resident.hasUnreadNotifications} />
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
            >
              <Avatar name={resident.name} src={resident.avatarUrl} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop */}
      <header className="hidden h-20 items-center justify-between gap-4 px-10 lg:flex">
        <div className="min-w-0">
          <p className="truncate text-label-sm uppercase tracking-wider text-on-surface-variant">
            {resident.society} · {resident.tower}
          </p>
          <p className="truncate text-headline-md text-on-surface">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationsLink unread={resident.hasUnreadNotifications} />
        </div>
      </header>
    </>
  );
}
