"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import { cn } from "@/lib/utils";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    .format(new Date(iso));
}

export function SaarthiHistory({ onPick }: { onPick: () => void }) {
  const { sessions, sessionId, loadSessions, openSession, removeSession } = useSaarthi();

  useEffect(() => {
    if (sessions === null) void loadSessions();
  }, [sessions, loadSessions]);

  if (sessions === null) {
    return <p className="p-6 text-callout text-ink-tertiary">Loading your chats…</p>;
  }
  if (sessions.length === 0) {
    return <p className="p-6 text-callout text-ink-tertiary">No chats yet. Ask Saarthi something to start one.</p>;
  }

  return (
    <ul className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Recent chats">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void openSession(session.id).then(onPick)}
            aria-current={session.id === sessionId ? "true" : undefined}
            className={cn(
              "min-w-0 flex-1 rounded-tile px-3 py-2.5 text-left transition-colors hover:bg-quiet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              session.id === sessionId && "bg-quiet",
            )}
          >
            <span className="block truncate text-callout text-ink">{session.title}</span>
            <span className="block text-caption text-ink-tertiary">{when(session.lastMessageAt)}</span>
          </button>
          <button
            type="button"
            onClick={() => void removeSession(session.id)}
            aria-label={`Delete chat: ${session.title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-tertiary hover:bg-quiet hover:text-status-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
