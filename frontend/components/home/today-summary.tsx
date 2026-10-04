"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { SaarthiAvatar } from "@/components/saarthi/saarthi-avatar";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import { getToday } from "@/lib/saarthi/api";

/**
 * The "Today" summary. Shows the notice digest straight away; when Saarthi is on, swaps in its
 * own summary of the day and opens the full answer on tap.
 */
export function TodaySummary({ fallback }: { fallback?: string }) {
  const { enabled, open } = useSaarthi();
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getToday()
      .then((today) => live && setSummary(today.summary))
      .catch(() => undefined); // Keep the digest text; Home must never break over this.
    return () => {
      live = false;
    };
  }, [enabled]);

  if (!summary) {
    return (
      <>
        <div className="flex items-center gap-2 text-caption text-ink-secondary">
          <Sparkles className="h-4 w-4 text-ink-secondary" strokeWidth={1.5} aria-hidden="true" />
          Summarised by Living+
        </div>
        {fallback ? <p className="text-body text-ink">{fallback}</p> : null}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open("What's on today?")}
      className="block w-full space-y-3 text-left"
      aria-label="Ask Saarthi what's on today"
    >
      <span className="flex items-center gap-2 text-caption text-ink-secondary">
        <SaarthiAvatar size="sm" className="h-5 w-5" />
        Summarised by Saarthi
      </span>
      <span className="block text-body text-ink">{summary}</span>
      <span className="block text-callout font-semibold text-primary">Ask Saarthi about today</span>
    </button>
  );
}
