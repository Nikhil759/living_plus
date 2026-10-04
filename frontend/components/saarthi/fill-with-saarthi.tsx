"use client";

import Link from "next/link";
import { useState } from "react";
import { SaarthiAvatar, type SaarthiState } from "@/components/saarthi/saarthi-avatar";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getDataSource } from "@/lib/data/source";
import { fillForm } from "@/lib/saarthi/api";
import type { FillForm, FillHint } from "@/lib/types/saarthi";
import { cn } from "@/lib/utils";

interface FillWithSaarthiProps {
  form: FillForm;
  /** Edit mode: the form's current values, so Saarthi changes only what the resident asks. */
  current?: Record<string, unknown>;
  /** Edit mode: the item being edited (an event never clashes with itself). */
  itemId?: string;
  /** Receives the values to put in the form. The resident still reviews and submits. */
  onFill: (values: Record<string, unknown>) => void;
  /** Issue form: join a similar open issue instead of filing a new one. */
  onMeToo?: (issueId: string) => void;
  className?: string;
}

/** "Fill with Saarthi": one or two sentences in, form fields filled. Never submits. */
export function FillWithSaarthi({ form, current, itemId, onFill, onMeToo, className }: FillWithSaarthiProps) {
  const [text, setText] = useState("");
  const [state, setState] = useState<SaarthiState>("idle");
  const [question, setQuestion] = useState<string | null>(null);
  const [hints, setHints] = useState<FillHint[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const busy = state === "thinking";
  const editing = Boolean(current);

  if (getDataSource() !== "api") return null;

  async function run() {
    const ask = text.trim();
    if (ask.length < 2 || busy) return;
    setState("thinking");
    setNote(null);
    try {
      const result = await fillForm(form, ask, current, itemId);
      const filledSomething = Object.keys(result.values).length > 0;
      if (filledSomething) onFill(result.values);
      setQuestion(result.question);
      setHints(result.hints);
      setState(filledSomething ? "happy" : "idle");
      if (!filledSomething && !result.question) {
        setNote(editing ? "I couldn't find a change in that. Try saying what to change." : "I couldn't find anything to fill from that.");
      }
    } catch (err) {
      setState("idle");
      setNote(err instanceof ApiError ? err.message : "Saarthi couldn't fill this right now. Please fill it in yourself.");
    }
  }

  return (
    <section
      aria-label="Fill with Saarthi"
      className={cn("space-y-2 rounded-card bg-primary/5 p-3 ring-1 ring-primary/15", className)}
    >
      <div className="flex items-center gap-2.5">
        <SaarthiAvatar state={state} size="sm" />
        <input
          value={text}
          maxLength={500}
          disabled={busy}
          aria-label={editing ? "Tell Saarthi what to change" : "Describe it for Saarthi"}
          placeholder={editing ? "Tell me what to change…" : "Describe it and I'll fill this in."}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // The box sits inside the page's form: Enter fills, it never submits that form.
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          className="h-9 min-w-0 flex-1 rounded-tile bg-surface-container-lowest px-3 text-callout text-ink outline-none ring-primary/30 placeholder:text-ink-tertiary focus:ring-2"
        />
        <Button type="button" size="sm" variant="primary" disabled={busy || text.trim().length < 2} onClick={() => void run()}>
          {busy ? "Filling…" : editing ? "Change" : "Fill"}
        </Button>
      </div>
      {question ? <p className="text-caption text-ink">{question}</p> : null}
      {note ? <p className="text-caption text-ink-secondary">{note}</p> : null}
      {hints.length > 0 ? (
        <ul className="space-y-1.5">
          {hints.map((hint) => (
            <li key={`${hint.kind}-${hint.text}`} className="flex flex-wrap items-center gap-2 text-caption text-ink-secondary">
              <span className="min-w-0 flex-1">{hint.text}</span>
              {hint.kind === "me_too" && hint.issueId && onMeToo ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => onMeToo(hint.issueId!)}>
                  Me too
                </Button>
              ) : hint.href ? (
                <Link href={hint.href} className="font-semibold text-primary">
                  View
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
