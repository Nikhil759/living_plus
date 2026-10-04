"use client";

import { usePathname } from "next/navigation";
import { SaarthiAvatar } from "@/components/saarthi/saarthi-avatar";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import { suggestionsFor } from "@/lib/saarthi/suggestions";

export function SaarthiEmptyState() {
  const pathname = usePathname();
  const { firstName, send, enabled } = useSaarthi();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <SaarthiAvatar size="xl" />
      <h2 className="mt-4 text-title text-ink">Hi {firstName}, I&apos;m Saarthi</h2>
      <p className="mt-1 max-w-xs text-callout text-ink-secondary">
        Ask me about society rules, what&apos;s happening, or getting things done in Living+.
      </p>
      {enabled ? (
        <ul className="mt-6 w-full space-y-2" aria-label="Suggested questions">
          {suggestionsFor(pathname).map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => send(question)}
                className="w-full rounded-tile bg-quiet px-4 py-3 text-left text-callout text-ink transition-colors hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-tile bg-quiet px-4 py-3 text-callout text-ink-secondary">
          Saarthi needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api to chat.
        </p>
      )}
    </div>
  );
}
