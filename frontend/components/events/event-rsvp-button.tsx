"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { rsvpEventApi, rsvpEventDemo } from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import { eventMainAction } from "@/lib/events/detail";
import type { HomeEvent } from "@/lib/types/home";

interface EventRsvpButtonProps {
  event: HomeEvent;
  backend: "demo" | "api";
  alreadyGoing: boolean;
}

export function EventRsvpButton({ event, backend, alreadyGoing }: EventRsvpButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(alreadyGoing);
  const action = eventMainAction({ ...event, viewerGoing: event.viewerGoing || going });

  async function onRsvp() {
    if (!action.enabled || action.kind !== "rsvp") return;
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
      setError(err instanceof ApiError ? err.message : "Could not RSVP.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={buttonVariants({ variant: action.kind === "rsvp" ? "primary" : "secondary" })}
        disabled={pending || !action.enabled}
        onClick={() => void onRsvp()}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
