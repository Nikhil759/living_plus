"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Home,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  ShoppingBag,
  Store,
  User,
  Users,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";
import type { SaarthiCard, SaarthiCardKind } from "@/lib/types/saarthi";

type Chip = SaarthiCard["chips"][number];
const chipClass =
  "rounded-full bg-quiet px-2.5 py-1 text-caption font-medium text-ink hover:bg-primary-tint " +
  "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/** A chip with an action (e.g. a free slot) proposes it on a confirmation card. */
function ActionChip({ chip, context }: { chip: Chip; context: string }) {
  const { propose } = useSaarthi();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Book ${context}, ${chip.label}`}
      onClick={async () => {
        setBusy(true);
        try {
          await propose(chip.action!);
        } finally {
          setBusy(false);
        }
      }}
      className={`${chipClass} disabled:opacity-50`}
    >
      {chip.label}
    </button>
  );
}

const ICONS: Record<SaarthiCardKind, LucideIcon> = {
  event: CalendarDays,
  slots: Clock,
  booking: Clock,
  amenity: Waves,
  issue: LifeBuoy,
  vendor: Wrench,
  listing: ShoppingBag,
  business: Store,
  opening: Home,
  group: Users,
  notice: Megaphone,
  post: MessageCircle,
  person: User,
};

function CardBody({ card }: { card: SaarthiCard }) {
  const Icon = ICONS[card.kind];
  return (
    <span className="flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-quiet text-ink-secondary">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-callout font-semibold text-ink">{card.title}</span>
          {card.badge ? (
            <span className="shrink-0 rounded-full bg-primary-tint px-2 py-0.5 text-caption font-medium text-primary">
              {card.badge}
            </span>
          ) : null}
        </span>
        {card.subtitle ? (
          <span className="block truncate text-caption text-ink-secondary">{card.subtitle}</span>
        ) : null}
        {card.detail ? (
          <span className="line-clamp-2 block text-caption text-ink-tertiary">{card.detail}</span>
        ) : null}
      </span>
    </span>
  );
}

/** Live results under a Saarthi reply; each opens the real page in the app. */
export function SaarthiCards({ cards }: { cards: SaarthiCard[] }) {
  return (
    <ul className="mt-2 space-y-2" aria-label="Results">
      {cards.map((card, index) => (
        <li
          key={`${card.kind}-${card.title}-${index}`}
          className="rounded-tile border border-hairline bg-card p-2.5"
        >
          {card.href ? (
            <Link
              href={card.href}
              className="block rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <CardBody card={card} />
            </Link>
          ) : (
            <CardBody card={card} />
          )}
          {card.chips.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5 pl-9">
              {card.chips.map((chip) =>
                chip.action ? (
                  <ActionChip
                    key={chip.label}
                    chip={chip}
                    context={[card.title, card.subtitle].filter(Boolean).join(" ")}
                  />
                ) : chip.href ? (
                  <Link key={chip.label} href={chip.href} className={chipClass}>
                    {chip.label}
                  </Link>
                ) : (
                  <span key={chip.label} className="rounded-full bg-quiet px-2.5 py-1 text-caption text-ink">
                    {chip.label}
                  </span>
                ),
              )}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
