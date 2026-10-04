"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { SaarthiAvatar, type SaarthiState } from "@/components/saarthi/saarthi-avatar";
import { SaarthiCards } from "@/components/saarthi/saarthi-cards";
import { SaarthiText } from "@/components/saarthi/saarthi-text";
import { useSaarthi, type UiMessage } from "@/components/saarthi/saarthi-provider";
import { stripCitationMarkers } from "@/lib/saarthi/citations";
import type { Citation } from "@/lib/types/saarthi";
import { cn } from "@/lib/utils";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-full text-ink-tertiary transition-colors " +
  "hover:bg-quiet hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function Feedback({ message }: { message: UiMessage }) {
  const { rate } = useSaarthi();
  const [askingWhy, setAskingWhy] = useState(false);
  const [reason, setReason] = useState("");

  if (askingWhy) {
    return (
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void rate(message.id, "down", reason);
          setAskingWhy(false);
        }}
      >
        <label className="sr-only" htmlFor={`why-${message.id}`}>
          What went wrong? (optional)
        </label>
        <input
          id={`why-${message.id}`}
          autoFocus
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="What went wrong? (optional)"
          className="h-9 min-w-0 flex-1 rounded-full bg-quiet px-3 text-callout text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="submit" className="h-9 rounded-full bg-primary px-3 text-callout font-semibold text-white">
          Send
        </button>
      </form>
    );
  }

  return (
    <div className="mt-1 flex gap-0.5">
      <button
        type="button"
        className={cn(iconButton, message.feedback === "up" && "text-primary")}
        aria-label="Helpful"
        aria-pressed={message.feedback === "up"}
        onClick={() => void rate(message.id, "up")}
      >
        <ThumbsUp className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(iconButton, message.feedback === "down" && "text-primary")}
        aria-label="Not helpful"
        aria-pressed={message.feedback === "down"}
        onClick={() => setAskingWhy(true)}
      >
        <ThumbsDown className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

function CitationChips({ citations }: { citations: Citation[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources from the society guide">
      {citations.map((c) => (
        <li key={`${c.documentId}#${c.anchor}`}>
          <Link
            href={`/guide/${c.documentId}#${c.anchor}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1 text-caption font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{c.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SaarthiMessage({
  message,
  isLast,
  avatarState,
}: {
  message: UiMessage;
  isLast: boolean;
  avatarState: SaarthiState;
}) {
  const { retry, statusText, busy } = useSaarthi();

  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-primary px-3.5 py-2 text-body text-white">
          {message.content}
        </p>
      </li>
    );
  }

  const streaming = message.status === "streaming";
  return (
    <li className="flex gap-2.5">
      <SaarthiAvatar size="sm" state={isLast ? avatarState : "idle"} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {streaming && !message.content ? (
          <p className="py-1 text-callout text-ink-tertiary">{statusText ?? "Thinking…"}</p>
        ) : (
          <p
            className={cn(
              "whitespace-pre-wrap py-0.5 text-body",
              message.status === "error" ? "text-ink-secondary" : "text-ink",
            )}
          >
            <SaarthiText text={stripCitationMarkers(message.content)} />
          </p>
        )}
        {message.cards.length > 0 ? <SaarthiCards cards={message.cards} /> : null}
        {message.citations.length > 0 ? <CitationChips citations={message.citations} /> : null}
        {message.status === "error" && isLast && !busy ? (
          <button
            type="button"
            onClick={retry}
            className="mt-1.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-tint px-3 text-callout font-semibold text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : null}
        {message.status === "ok" && message.saved ? <Feedback message={message} /> : null}
      </div>
    </li>
  );
}
