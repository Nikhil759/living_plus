"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, History, SquarePen, X } from "lucide-react";
import { SaarthiAvatar } from "@/components/saarthi/saarthi-avatar";
import { SaarthiComposer } from "@/components/saarthi/saarthi-composer";
import { SaarthiEmptyState } from "@/components/saarthi/saarthi-empty-state";
import { SaarthiHistory } from "@/components/saarthi/saarthi-history";
import { SaarthiMessage } from "@/components/saarthi/saarthi-message";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-quiet hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children}
    </button>
  );
}

/** Wraps page content so it makes room for the open panel on desktop. */
export function SaarthiShell({ children }: { children: ReactNode }) {
  const { isOpen } = useSaarthi();
  return <div className={cn("min-w-0 lg:pl-sidebar", isOpen && "lg:pr-[420px]")}>{children}</div>;
}

export function SaarthiPanel() {
  const { isOpen, close, messages, avatarState, announcement, newChat, busy } = useSaarthi();
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<"chat" | "history">("chat");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Focus the composer on open and give focus back to whatever opened the panel on close.
  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    returnFocusRef.current?.focus?.();
    returnFocusRef.current = null;
    setView("chat");
  }, [isOpen]);

  // Mobile is full screen: stop the page behind it from scrolling.
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, isDesktop]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <section
      role={isDesktop ? "complementary" : "dialog"}
      aria-modal={isDesktop ? undefined : true}
      aria-label="Saarthi"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
      className="fixed inset-0 z-[70] flex flex-col bg-card pt-safe lg:inset-y-0 lg:left-auto lg:right-0 lg:z-50 lg:w-[420px] lg:border-l lg:border-hairline lg:pt-0 lg:shadow-card"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-3">
        {view === "history" ? (
          <HeaderButton label="Back to chat" onClick={() => setView("chat")}>
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </HeaderButton>
        ) : (
          <SaarthiAvatar size="md" state={avatarState} />
        )}
        <h2 className="flex-1 text-headline text-ink">{view === "history" ? "Recent chats" : "Saarthi"}</h2>
        {view === "chat" ? (
          <HeaderButton label="Recent chats" onClick={() => setView("history")}>
            <History className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </HeaderButton>
        ) : null}
        <HeaderButton
          label="New chat"
          onClick={() => {
            newChat();
            setView("chat");
            inputRef.current?.focus();
          }}
        >
          <SquarePen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </HeaderButton>
        <HeaderButton label="Close Saarthi" onClick={close}>
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </HeaderButton>
      </header>

      {view === "history" ? (
        <SaarthiHistory onPick={() => setView("chat")} />
      ) : (
        <>
          {messages.length === 0 ? (
            <SaarthiEmptyState />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4" aria-busy={busy}>
              <ul className="space-y-4" aria-label="Conversation">
                {messages.map((message, index) => (
                  <SaarthiMessage
                    key={message.id}
                    message={message}
                    isLast={index === messages.length - 1}
                    avatarState={avatarState}
                  />
                ))}
              </ul>
              <div ref={endRef} />
            </div>
          )}
          <div className="pb-safe">
            <SaarthiComposer ref={inputRef} />
          </div>
        </>
      )}

      {/* Whole replies are announced once finished, not token by token. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
