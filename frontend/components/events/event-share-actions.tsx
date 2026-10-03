"use client";

import { useState } from "react";
import { eventIcs } from "@/lib/events/detail";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

interface EventShareActionsProps {
  event: HomeEvent;
  className?: string;
}

export function EventShareActions({ event, className }: EventShareActionsProps) {
  const [copied, setCopied] = useState(false);

  function addToCalendar() {
    const url = window.location.href;
    const blob = new Blob([eventIcs(event, url)], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${event.id}.ics`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      <button
        type="button"
        onClick={addToCalendar}
        className="text-caption font-semibold text-primary hover:opacity-80"
      >
        Add to calendar
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="text-caption font-semibold text-primary hover:opacity-80"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
