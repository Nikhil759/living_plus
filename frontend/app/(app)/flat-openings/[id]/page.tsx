import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Home, MapPin, User } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadFlatOpeningById } from "@/lib/data";
import {
  FLAT_OPENING_KIND_LABEL,
  FURNISHING_LABEL,
  formatAvailableFrom,
  formatRentInr,
} from "@/lib/flat-opening-labels";
import { listingContactHref } from "@/lib/marketplace-labels";

interface FlatOpeningDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlatOpeningDetailPage({ params }: FlatOpeningDetailPageProps) {
  const { id } = await params;
  const opening = await loadFlatOpeningById(id);
  if (!opening) notFound();

  const canContact = opening.status === "active";
  const contactMessage = `Hi, I'm interested in your listing "${opening.title}" on Living+ Flat Openings.`;
  const contactLabel = opening.contact.type === "whatsapp" ? "Message on WhatsApp" : "Call";

  return (
    <AppPage title="Opening">
      <Link href="/flat-openings" className="text-callout font-semibold text-primary">
        All openings
      </Link>
      <Card className="mt-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-title text-ink">{opening.title}</h1>
          <p className="text-title text-primary">{formatRentInr(opening.rentInr)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{FLAT_OPENING_KIND_LABEL[opening.kind]}</Badge>
          <Badge>{FURNISHING_LABEL[opening.furnishing]}</Badge>
          {opening.status === "filled" ? <Badge>Filled</Badge> : null}
        </div>
        <p className="text-body text-ink-secondary">{opening.description}</p>
        <ul className="space-y-2 text-body text-ink-secondary">
          <li className="flex items-center gap-2">
            <Home className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
            {opening.bhk} · {opening.tower}
            {opening.flatNo ? ` · Flat ${opening.flatNo}` : ""}
          </li>
          <li className="flex items-center gap-2">
            <Calendar className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
            Available from {formatAvailableFrom(opening.availableFrom)}
          </li>
          <li className="flex items-center gap-2">
            <User className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
            {opening.postedBy}
          </li>
          {opening.preferences ? (
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              {opening.preferences}
            </li>
          ) : null}
        </ul>
        {canContact ? (
          <a
            href={listingContactHref(opening.contact, contactMessage)}
            className={buttonVariants({ variant: "primary" })}
            target={opening.contact.type === "whatsapp" ? "_blank" : undefined}
            rel={opening.contact.type === "whatsapp" ? "noopener noreferrer" : undefined}
          >
            {contactLabel}
          </a>
        ) : (
          <button type="button" className={buttonVariants({ variant: "primary" })} disabled>
            No longer available
          </button>
        )}
      </Card>
    </AppPage>
  );
}
