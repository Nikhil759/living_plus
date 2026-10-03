"use client";

import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { formatPriceInr } from "@/lib/format";
import type { HomeEvent } from "@/lib/types/home";

interface EventDetailMobileBarProps {
  event: HomeEvent;
  backend: "demo" | "api";
}

export function EventDetailMobileBar({ event, backend }: EventDetailMobileBarProps) {
  return (
    <div
      className="fixed inset-x-0 z-[55] border-t border-hairline bg-card/95 px-4 py-3 backdrop-blur-md md:hidden"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-content items-center gap-3">
        <div className="shrink-0">
          <p className="text-headline text-ink">{formatPriceInr(event.priceInr)}</p>
        </div>
        <EventRsvpButton
          event={event}
          backend={backend}
          alreadyGoing={Boolean(event.viewerGoing)}
          className="min-w-0 flex-1"
          fullWidth
        />
      </div>
    </div>
  );
}
