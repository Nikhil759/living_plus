import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { AvailabilityPill } from "@/components/local-businesses/availability-pill";
import { BusinessPhoto } from "@/components/local-businesses/business-photo";
import { CommitteeTools } from "@/components/local-businesses/committee-tools";
import { ContactOwnerButton } from "@/components/local-businesses/contact-owner-button";
import { FollowButton } from "@/components/local-businesses/follow-button";
import { OwnerTools } from "@/components/local-businesses/owner-tools";
import { RecommendControl } from "@/components/local-businesses/recommend-control";
import { RemoveNoteButton } from "@/components/local-businesses/remove-note-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadLocalBusinessById } from "@/lib/data";
import {
  BUSINESS_CATEGORY_LABEL,
  daysLabel,
  priceWithUnit,
  recommendedLabel,
  SERVES_LABEL,
  shortAgo,
} from "@/lib/local-businesses/view";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  const business = await loadLocalBusinessById(id);
  if (!business) notFound();

  const approved = business.reviewStatus === "approved";
  const isOwner = business.canManage;
  const canContact = approved && !isOwner;
  const committeeView = business.canModerate && !isOwner;

  return (
    <AppPage title="Business" backHref="/local-businesses" backLabel="Local businesses">
      <div className="mx-auto w-full max-w-content">
        {/* Edge to edge on small screens, a 280px banner on desktop. */}
        <BusinessPhoto
          name={business.name}
          category={business.category}
          src={business.coverUrl}
          large
          className="-mx-4 aspect-video sm:-mx-5 lg:mx-0 lg:aspect-auto lg:h-[280px] lg:rounded-card"
        />

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-8 lg:w-[640px] lg:shrink-0">
            <header className="space-y-3">
              <h1 className="text-title text-ink">{business.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{BUSINESS_CATEGORY_LABEL[business.category]}</Badge>
                {approved ? (
                  <Badge tone="primary" className="gap-1 text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    Verified resident
                  </Badge>
                ) : null}
              </div>
              <p className="text-body text-ink-secondary">{business.tagline}</p>
              <div className="flex items-center gap-3 pt-1">
                <Avatar
                  name={business.owner.firstName}
                  src={business.owner.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-headline text-ink">
                    {business.owner.firstName}
                    {business.owner.tower ? ` · ${business.owner.tower}` : ""}
                  </p>
                  <p className="text-callout text-ink-secondary">
                    on Living+ since {business.owner.memberSince}
                  </p>
                </div>
              </div>
            </header>

            {business.reviewStatus === "pending" ? (
              <p className="rounded-card bg-quiet p-4 text-callout text-ink-secondary">
                Submitted. The committee usually approves within a day. Until then only you and the
                committee can see this page.
              </p>
            ) : null}
            {business.reviewStatus === "rejected" ? (
              <div className="space-y-3 rounded-card bg-quiet p-4">
                <p className="text-callout font-semibold text-ink">Not approved yet</p>
                <p className="text-callout text-ink-secondary">{business.rejectionReason}</p>
                {isOwner ? (
                  <Link
                    href={`/local-businesses/${business.id}/edit`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Edit and resubmit
                  </Link>
                ) : null}
              </div>
            ) : null}

            {business.about ? (
              <section className="space-y-2">
                <h2 className="text-headline text-ink">About</h2>
                <p className="whitespace-pre-line text-body text-ink-secondary">{business.about}</p>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-headline text-ink">Offerings</h2>
              <ul className="divide-y divide-hairline rounded-card bg-card shadow-card">
                {business.offerings.map((offering) => (
                  <li
                    key={offering.name}
                    className="flex items-start justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-body text-ink">{offering.name}</p>
                      {offering.note ? (
                        <p className="text-caption text-ink-secondary">{offering.note}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-body font-semibold text-ink">
                      {priceWithUnit(offering.priceInr, offering.unit)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {business.photos.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-headline text-ink">Photos</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {business.photos.map((photo, index) => (
                    <li key={photo}>
                      <BusinessPhoto
                        name={`${business.name}, photo ${index + 1}`}
                        category={business.category}
                        src={photo}
                        className="aspect-square w-full rounded-tile"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-headline text-ink">Recommendations</h2>
              <p className="text-callout text-ink-secondary">
                {recommendedLabel(business.recommendationCount)}
              </p>
              {business.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {business.recommendations.map((item) => (
                    <li key={item.id} className="rounded-card bg-card p-4 shadow-card">
                      <p className="text-body text-ink">&ldquo;{item.note}&rdquo;</p>
                      <p className="mt-1 text-caption text-ink-secondary">
                        {item.firstName}
                        {item.tower ? ` · ${item.tower}` : ""} · {shortAgo(item.createdAt)}
                      </p>
                      {committeeView ? (
                        <RemoveNoteButton businessId={business.id} recommendationId={item.id} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          {/* On mobile the status, update and actions come before the long profile. */}
          <aside className="order-first space-y-4 lg:sticky lg:top-24 lg:order-none lg:w-[380px] lg:shrink-0">
            <Card className="space-y-4 p-5 sm:p-6">
              <AvailabilityPill availability={business.availability} />

              {business.latestUpdate ? (
                <div className="rounded-tile bg-quiet p-3.5">
                  <p className="text-body text-ink">{business.latestUpdate.text}</p>
                  <p className="mt-1 text-caption text-ink-tertiary">
                    {shortAgo(business.latestUpdate.createdAt)}
                  </p>
                </div>
              ) : null}

              <div className="space-y-1.5 text-callout text-ink-secondary">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {business.timings} · {daysLabel(business.days)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {SERVES_LABEL[business.serves]}
                </p>
              </div>

              {canContact ? (
                <>
                  <ContactOwnerButton
                    businessId={business.id}
                    method={business.contactMethod}
                    className="hidden lg:block"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FollowButton businessId={business.id} initialFollowing={business.viewer.following} />
                    <RecommendControl businessId={business.id} initialViewer={business.viewer} />
                  </div>
                </>
              ) : null}
              {isOwner ? <OwnerTools business={business} /> : null}
            </Card>
            {committeeView ? (
              <CommitteeTools
                businessId={business.id}
                canReview={business.canReview}
                canRemove
              />
            ) : null}
          </aside>
        </div>
      </div>

      {canContact ? (
        <div
          className="fixed inset-x-0 z-[55] border-t border-hairline bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto max-w-content">
            <ContactOwnerButton businessId={business.id} method={business.contactMethod} hint={false} />
          </div>
        </div>
      ) : null}
    </AppPage>
  );
}
