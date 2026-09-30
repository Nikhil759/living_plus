import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

export interface AskAanganBarProps {
  suggestion: string;
  href?: string;
}

/** Sticky "Ask Aangan" pill that floats above the bottom nav. */
export function AskAanganBar({ suggestion, href = "/ask-aangan" }: AskAanganBarProps) {
  return (
    // Mobile: floats above the bottom nav. Desktop (no bottom nav): sits in the flow / side rail.
    <aside className="sticky bottom-20 z-40 px-1 lg:static lg:px-0">
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-full bg-surface-container-lowest/95 p-2 pr-3 shadow-card ring-1 ring-outline-variant/30 backdrop-blur-xl transition-transform active:scale-[0.99]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 text-label-md text-on-surface">
              Ask Aangan
              <span className="text-label-sm text-primary">✨ AI</span>
            </span>
            <span className="truncate text-body-sm text-on-surface-variant">
              “{suggestion}”
            </span>
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
    </aside>
  );
}
