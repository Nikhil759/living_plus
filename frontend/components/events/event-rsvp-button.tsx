"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { leaveEventApi, rsvpEventApi, rsvpEventDemo } from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import { eventGoingLabel, eventMainAction, isMutedEventAction } from "@/lib/events/detail";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

interface EventRsvpButtonProps {
  event: HomeEvent;
  backend: "demo" | "api";
  alreadyGoing: boolean;
  className?: string;
  fullWidth?: boolean;
  layout?: "card" | "bar";
  guestCount?: number;
}

export function EventRsvpButton({
  event,
  backend,
  alreadyGoing,
  className,
  fullWidth,
  layout = "card",
  guestCount,
}: EventRsvpButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(alreadyGoing);
  const action = eventMainAction({ ...event, viewerGoing: going });

  useEffect(() => {
    setGoing(alreadyGoing);
  }, [alreadyGoing]);

  async function join() {
    if (action.kind !== "rsvp" && action.kind !== "pay" && action.kind !== "waitlist") return;
    if (!action.enabled) return;
    setPending(true);
    setError(null);
    try {
      if (backend === "demo") {
        await rsvpEventDemo(event.id);
      } else {
        await rsvpEventApi(event.id);
      }
      setGoing(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update RSVP.");
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    if (backend !== "api") {
      setError("Leaving an RSVP is only available on the API.");
      return;
    }
    const confirmed = window.confirm(`Can't make it to ${event.title}? Your spot will be freed.`);
    if (!confirmed) return;
    setPending(true);
    setError(null);
    try {
      await leaveEventApi(event.id);
      setGoing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update RSVP.");
    } finally {
      setPending(false);
    }
  }

  const goingLabel = eventGoingLabel(guestCount);
  const errorLine = error ? <p className="text-caption text-error">{error}</p> : null;

  if (action.kind === "leave") {
    if (layout === "bar") {
      return (
        <div className={cn("flex min-w-0 flex-1 flex-col items-end gap-0.5", className)}>
          <p className="text-headline text-status-green">{goingLabel} ✓</p>
          <button
            type="button"
            className="text-caption text-ink-tertiary hover:text-ink-secondary"
            disabled={pending}
            onClick={() => void leave()}
          >
            {pending ? "Saving…" : "Can't make it?"}
          </button>
          {errorLine}
        </div>
      );
    }
    return (
      <div className={cn("space-y-1", className)}>
        <p className="flex items-center gap-2 text-body font-semibold text-status-green">
          <Check className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          {goingLabel}
        </p>
        <button
          type="button"
          className="text-callout text-ink-tertiary hover:text-ink-secondary"
          disabled={pending}
          onClick={() => void leave()}
        >
          {pending ? "Saving…" : "Can't make it?"}
        </button>
        {errorLine}
      </div>
    );
  }

  if (isMutedEventAction(action.kind)) {
    return (
      <div className={cn(className)}>
        <p className="text-callout text-ink-tertiary">{action.label}</p>
        {errorLine}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", fullWidth && "w-full", className)}>
      <button
        type="button"
        className={buttonVariants({
          variant: "primary",
          className: fullWidth ? "w-full" : undefined,
        })}
        disabled={pending || !action.enabled}
        onClick={() => void join()}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {errorLine}
    </div>
  );
}
