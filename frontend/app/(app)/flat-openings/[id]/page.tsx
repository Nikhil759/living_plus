import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { CommitteeRemove } from "@/components/openings/committee-remove";
import { ContactPosterButton } from "@/components/openings/contact-poster-button";
import { OwnerActions } from "@/components/openings/owner-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadFlatOpeningById } from "@/lib/data";
import {
  availableLong,
  bhkLabel,
  floorLabel,
  formatInr,
  formatRent,
  FURNISHING_LABEL,
  INCLUDED_LABEL,
  KIND_LABEL,
  maintenanceLabel,
  PREFERENCE_LABEL,
  postedOn,
} from "@/lib/openings/view";

interface FlatOpeningDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlatOpeningDetailPage({ params }: FlatOpeningDetailPageProps) {
  const { id } = await params;
  const opening = await loadFlatOpeningById(id);
  if (!opening) notFound();

  const facts: Array<[string, string]> = [
    ["Rent", formatRent(opening.rentInr)],
    ["Deposit", opening.depositInr ? formatInr(opening.depositInr) : "Not mentioned"],
    ["Maintenance", maintenanceLabel(opening.maintenanceIncluded, opening.maintenanceInr)],
    ["Available from", availableLong(opening.availableFrom)],
    ["BHK", bhkLabel(opening.bhk)],
    ["Floor", floorLabel(opening.floor) ?? "Not mentioned"],
    ["Furnishing", FURNISHING_LABEL[opening.furnishing]],
    ["Preference", PREFERENCE_LABEL[opening.preference]],
  ];
  const open = opening.state === "active";

  return (
    <AppPage title="Flat opening" backHref="/flat-openings" backLabel="Flat openings">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{KIND_LABEL[opening.kind]}</Badge>
              {opening.state === "filled" ? <Badge dot="quiet">Filled</Badge> : null}
              {opening.state === "expired" ? <Badge dot="quiet">Ended</Badge> : null}
            </div>
            <h1 className="text-title text-ink">{opening.title}</h1>
            <p className="text-[28px] font-semibold leading-9 text-primary">{formatRent(opening.rentInr)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-5">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-caption text-ink-tertiary">{label}</dt>
                <dd className="text-body text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {opening.included.length > 0 ? (
            <section className="space-y-2 border-t border-hairline pt-5" aria-label="Included">
              <h2 className="text-headline text-ink">Included</h2>
              <ul className="flex flex-wrap gap-2">
                {opening.included.map((item) => (
                  <li key={item}>
                    <Badge>{INCLUDED_LABEL[item]}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2 border-t border-hairline pt-5">
            <h2 className="text-headline text-ink">Description</h2>
            <p className="whitespace-pre-line text-body text-ink-secondary">{opening.description}</p>
          </section>

          <p className="border-t border-hairline pt-5 text-callout text-ink-secondary">
            Posted by {opening.poster.firstName} · {opening.poster.tower} · {postedOn(opening.postedAt)}
          </p>
        </Card>

        {opening.isMine ? (
          <Card className="p-5 sm:p-6">
            <OwnerActions
              openingId={opening.id}
              state={opening.state}
              canRenew={opening.canRenew}
              expiresAt={opening.expiresAt}
            />
          </Card>
        ) : open ? (
          <ContactPosterButton openingId={opening.id} method={opening.contactMethod} />
        ) : (
          <p className="text-center text-callout text-ink-secondary">This opening is no longer available.</p>
        )}

        {opening.canRemove && !opening.isMine ? <CommitteeRemove openingId={opening.id} /> : null}
      </div>
    </AppPage>
  );
}
