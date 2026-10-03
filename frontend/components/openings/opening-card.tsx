import Link from "next/link";
import { ContactPosterButton } from "@/components/openings/contact-poster-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cardFacts, formatRent, KIND_LABEL, postedAgo } from "@/lib/openings/view";
import { cn } from "@/lib/utils";
import type { FlatOpeningCard } from "@/lib/types/flat-opening";

const CARD = "relative flex h-full flex-col gap-3 rounded-card bg-card p-5 shadow-card";

/**
 * A text-only directory card. The title is a stretched link covering the card, and the Contact
 * button sits above it. `preview` renders the same card for the form, without links.
 */
export function OpeningCard({
  opening,
  preview = false,
}: {
  opening: FlatOpeningCard;
  preview?: boolean;
}) {
  const title = (
    <p className="line-clamp-2 text-headline text-ink">{opening.title}</p>
  );

  return (
    <div
      className={cn(
        CARD,
        !preview &&
          "transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone="primary">{KIND_LABEL[opening.kind]}</Badge>
        <p className="shrink-0 text-title text-ink">{formatRent(opening.rentInr)}</p>
      </div>

      {preview ? (
        title
      ) : (
        <Link
          href={`/flat-openings/${opening.id}`}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-primary/40"
        >
          {title}
        </Link>
      )}

      <ul className="flex flex-wrap gap-2">
        {cardFacts(opening).map((fact) => (
          <li key={fact}>
            <Badge>{fact}</Badge>
          </li>
        ))}
      </ul>

      <p className="line-clamp-1 text-body text-ink-secondary">{opening.description}</p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <p className="min-w-0 truncate text-caption text-ink-tertiary">
          Posted by {opening.postedBy} · {postedAgo(opening.postedAt)}
        </p>
        {opening.isMine ? (
          <Badge>Your opening</Badge>
        ) : preview ? (
          <Button size="sm" variant="secondary" tabIndex={-1} aria-hidden="true">
            Contact
          </Button>
        ) : (
          <ContactPosterButton
            openingId={opening.id}
            method={opening.contactMethod}
            compact
            className="relative z-10 shrink-0"
          />
        )}
      </div>
    </div>
  );
}

export function OpeningCardSkeleton() {
  return (
    <div className="space-y-3 rounded-card bg-card p-5 shadow-card" aria-hidden="true">
      <div className="flex justify-between">
        <div className="shimmer h-6 w-28 rounded-full" />
        <div className="shimmer h-7 w-24 rounded-tile" />
      </div>
      <div className="shimmer h-5 w-2/3 rounded-tile" />
      <div className="flex gap-2">
        <div className="shimmer h-6 w-24 rounded-full" />
        <div className="shimmer h-6 w-32 rounded-full" />
        <div className="shimmer h-6 w-20 rounded-full" />
      </div>
      <div className="shimmer h-4 w-full rounded-tile" />
      <div className="flex items-center justify-between pt-1">
        <div className="shimmer h-3 w-40 rounded-tile" />
        <div className="shimmer h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}
