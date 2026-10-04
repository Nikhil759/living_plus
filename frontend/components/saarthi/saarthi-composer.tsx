"use client";

import { forwardRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";

const MAX_CHARS = 2000;

export const SaarthiComposer = forwardRef<HTMLTextAreaElement>(function SaarthiComposer(_, ref) {
  const { send, busy, enabled } = useSaarthi();
  const [text, setText] = useState("");
  const canSend = enabled && !busy && text.trim().length > 0;

  function submit() {
    if (!canSend) return;
    send(text);
    setText("");
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-hairline p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor="saarthi-input" className="sr-only">
        Message Saarthi
      </label>
      <textarea
        id="saarthi-input"
        ref={ref}
        rows={1}
        maxLength={MAX_CHARS}
        value={text}
        disabled={!enabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends; Shift+Enter adds a line. Ignore Enter while an IME is composing (Hindi input).
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Ask Saarthi anything…"
        className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] bg-quiet px-4 py-2.5 text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
});
