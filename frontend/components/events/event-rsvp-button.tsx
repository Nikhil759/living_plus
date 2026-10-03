"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { leaveEventApi, rsvpEventApi, rsvpEventDemo } from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import { eventMainAction } from "@/lib/events/detail";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

interface EventRsvpButtonProps {
  event: HomeEvent;
  backend: "demo" | "api";
  alreadyGoing: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function EventRsvpButton({
  event,
  backend,
  alreadyGoing,
  className,
  fullWidth,
}: EventRsvpButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(alreadyGoing);
  const action = eventMainAction({ ...event, viewerGoing: going });

  useEffect(() => {
    setGoing(alreadyGoing);
  }, [alreadyGoing]);

  async function onClick() {
    if (!action.enabled || (action.kind !== "rsvp" && action.kind !== "leave")) return;
    setPending(true);
    setError(null);
    try {
      if (action.kind === "leave") {
        if (backend !== "api") {
          throw new ApiError("Leaving an RSVP is only available on the API.", 400, "validation_error");
        }
        await leaveEventApi(event.id);
        setGoing(false);
      } else if (backend === "demo") {
        await rsvpEventDemo(event.id);
        setGoing(true);
      } else {
        await rsvpEventApi(event.id);
        setGoing(true);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update RSVP.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("space-y-2", fullWidth && "w-full", className)}>
      <button
        type="button"
        className={buttonVariants({
          variant: action.kind === "rsvp" ? "primary" : "secondary",
          className: fullWidth ? "w-full" : undefined,
        })}
        disabled={pending || !action.enabled}
        onClick={() => void onClick()}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
