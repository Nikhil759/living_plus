"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  joinWaitlistApi,
  leaveEventApi,
  leaveWaitlistApi,
  rsvpEventApi,
  rsvpEventDemo,
} from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import {
  eventGoingLabel,
  eventMainAction,
  eventMaxGuests,
  eventRsvpQty,
  guestStepperLabel,
  isMutedEventAction,
} from "@/lib/events/detail";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

interface EventRsvpButtonProps {
  event: HomeEvent;
  backend: "demo" | "api";
  alreadyGoing: boolean;
  className?: string;
  fullWidth?: boolean;
  layout?: "card" | "bar";
}

export function EventRsvpButton({
  event,
  backend,
  alreadyGoing,
  className,
  fullWidth,
  layout = "card",
}: EventRsvpButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(alreadyGoing);
  const [waitlisted, setWaitlisted] = useState(Boolean(event.viewerWaitlisted));
  const [guests, setGuests] = useState(event.viewerGuestCount ?? 0);
  const action = eventMainAction({ ...event, viewerGoing: going, viewerWaitlisted: waitlisted });
  const maxGuests = eventMaxGuests({
    ...event,
    viewerGoing: going,
    viewerWaitlisted: waitlisted,
  });
  const showGuests = maxGuests > 0 || guests > 0;

  useEffect(() => {
    setGoing(alreadyGoing);
    setWaitlisted(Boolean(event.viewerWaitlisted));
    setGuests(event.viewerGuestCount ?? 0);
  }, [alreadyGoing, event.viewerWaitlisted, event.viewerGuestCount]);

  async function join(nextGuests = guests) {
    if (action.kind !== "rsvp" && action.kind !== "leave" && action.kind !== "pay" && action.kind !== "waitlist") {
      return;
    }
    if (action.kind !== "leave" && !action.enabled) return;
    setPending(true);
    setError(null);
    try {
      if (backend === "demo") {
        await rsvpEventDemo(event.id);
        setGoing(true);
      } else if (action.kind === "waitlist") {
        await joinWaitlistApi(event.id, eventRsvpQty(nextGuests));
        setWaitlisted(true);
        setGoing(false);
      } else {
        await rsvpEventApi(event.id, eventRsvpQty(nextGuests));
        setGoing(true);
        setWaitlisted(false);
      }
      setGuests(nextGuests);
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
      setGuests(0);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update RSVP.");
    } finally {
      setPending(false);
    }
  }

  async function saveWaitlist(nextGuests = guests) {
    if (backend !== "api") {
      setError("The waitlist is only available on the API.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await joinWaitlistApi(event.id, eventRsvpQty(nextGuests));
      setWaitlisted(true);
      setGuests(nextGuests);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the waitlist.");
    } finally {
      setPending(false);
    }
  }

  async function leaveWaitlist() {
    if (backend !== "api") {
      setError("The waitlist is only available on the API.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await leaveWaitlistApi(event.id);
      setWaitlisted(false);
      setGuests(0);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update RSVP.");
    } finally {
      setPending(false);
    }
  }

  const goingLabel = eventGoingLabel(guests);
  const errorLine = error ? <p className="text-caption text-error">{error}</p> : null;
  const guestsDirty =
    (going || waitlisted) && guests !== (event.viewerGuestCount ?? 0);

  function GuestStepper({ compact = false }: { compact?: boolean }) {
    if (!showGuests) return null;
    return (
      <div className={cn("flex items-center gap-2", compact ? "justify-end" : null)}>
        <span className="text-caption text-ink-secondary">{compact ? "Guests" : "Guests coming with you"}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-quiet text-ink disabled:opacity-40"
            disabled={pending || guests <= 0}
            aria-label="Fewer guests"
            onClick={() => setGuests((n) => Math.max(0, n - 1))}
          >
            <Minus className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="min-w-16 text-center text-callout font-semibold text-ink">
            {guestStepperLabel(guests)}
          </span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-quiet text-ink disabled:opacity-40"
            disabled={pending || guests >= maxGuests}
            aria-label="More guests"
            onClick={() => setGuests((n) => Math.min(maxGuests, n + 1))}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  if (action.kind === "leave") {
    if (layout === "bar") {
      return (
        <div className={cn("flex min-w-0 flex-1 flex-col items-end gap-1", className)}>
          <p className="text-headline text-status-green">{goingLabel} ✓</p>
          <GuestStepper compact />
          {guestsDirty ? (
            <button
              type="button"
              className="text-caption font-semibold text-primary"
              disabled={pending}
              onClick={() => void join(guests)}
            >
              {pending ? "Saving…" : "Update guests"}
            </button>
          ) : (
            <button
              type="button"
              className="text-caption text-ink-tertiary hover:text-ink-secondary"
              disabled={pending}
              onClick={() => void leave()}
            >
              {pending ? "Saving…" : "Can't make it?"}
            </button>
          )}
          {errorLine}
        </div>
      );
    }
    return (
      <div className={cn("space-y-3", className)}>
        <p className="flex items-center gap-2 text-body font-semibold text-status-green">
          <Check className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          {goingLabel}
        </p>
        <GuestStepper />
        <div className="flex flex-col items-start gap-1">
          {guestsDirty ? (
            <button
              type="button"
              className={buttonVariants({ variant: "secondary", className: fullWidth ? "w-full" : undefined })}
              disabled={pending}
              onClick={() => void join(guests)}
            >
              {pending ? "Saving…" : "Update guests"}
            </button>
          ) : null}
          <button
            type="button"
            className="text-callout text-ink-tertiary hover:text-ink-secondary"
            disabled={pending}
            onClick={() => void leave()}
          >
            {pending ? "Saving…" : "Can't make it?"}
          </button>
        </div>
        {errorLine}
      </div>
    );
  }

  if (action.kind === "waitlisted") {
    const leaveWaitlistButton = (
      <button
        type="button"
        className={layout === "bar" ? "text-caption text-ink-tertiary hover:text-ink-secondary" : "text-callout text-ink-tertiary hover:text-ink-secondary"}
        disabled={pending}
        onClick={() => void leaveWaitlist()}
      >
        {pending ? "Saving…" : "Leave waitlist"}
      </button>
    );
    const updateGuestsButton = guestsDirty ? (
      <button
        type="button"
        className={
          layout === "bar"
            ? "text-caption font-semibold text-primary"
            : buttonVariants({ variant: "secondary", className: fullWidth ? "w-full" : undefined })
        }
        disabled={pending}
        onClick={() => void saveWaitlist(guests)}
      >
        {pending ? "Saving…" : "Update guests"}
      </button>
    ) : null;
    if (layout === "bar") {
      return (
        <div className={cn("flex min-w-0 flex-1 flex-col items-end gap-1", className)}>
          <p className="text-headline text-ink-secondary">On the waitlist</p>
          <GuestStepper compact />
          {updateGuestsButton ?? leaveWaitlistButton}
          {errorLine}
        </div>
      );
    }
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-body font-semibold text-ink-secondary">On the waitlist</p>
        <GuestStepper />
        <div className="flex flex-col items-start gap-1">
          {updateGuestsButton}
          {leaveWaitlistButton}
        </div>
        {errorLine}
      </div>
    );
  }

  if (action.kind === "stall") {
    if (!action.enabled) {
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
          onClick={() => document.getElementById("event-stalls")?.scrollIntoView({ behavior: "smooth" })}
        >
          {action.label}
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
    <div className={cn("space-y-3", fullWidth && "w-full", className)}>
      <GuestStepper compact={layout === "bar"} />
      <button
        type="button"
        className={buttonVariants({
          variant: "primary",
          className: fullWidth ? "w-full" : undefined,
        })}
        disabled={pending || !action.enabled}
        onClick={() => void join(guests)}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {errorLine}
    </div>
  );
}
