"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { rsvpEventApi, rsvpEventDemo } from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
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

  async function onRsvp() {
    if (going || event.priceInr > 0) return;
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

  const label = going ? "Going" : event.actionLabel;
  const variant = going ? "secondary" : event.actionTone === "solid" ? "primary" : "secondary";

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={buttonVariants({ variant })}
        disabled={pending || going || event.priceInr > 0}
        onClick={() => void onRsvp()}
      >
        {pending ? "Saving…" : label}
      </button>
      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
