import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clock, Home, MapPin, Ticket, Users } from "lucide-react";
import { EventCover } from "@/components/events/event-cover";
import {
  EVENT_DETAIL_ASIDE,
  EVENT_DETAIL_BODY,
  EVENT_DETAIL_GRID,
  EVENT_DETAIL_HEADER,
  EVENT_DETAIL_PAGE_PADDING,
} from "@/components/events/event-detail-layout";
import { EventDetailMobileBar } from "@/components/events/event-detail-mobile-bar";
import { EventDetailTopBar } from "@/components/events/event-detail-top-bar";
import { EventManageActions } from "@/components/events/event-manage-actions";
import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { EventShareActions } from "@/components/events/event-share-actions";
import { AvatarStack } from "@/components/home/avatar-stack";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EVENT_CATEGORY_LABEL } from "@/lib/events/categories";
import {
  eventAudienceLabel,
  eventBanners,
  eventCapacityRatio,
  eventCoverPill,
  eventSpotsLabel,
  eventVenueHref,
} from "@/lib/events/detail";
import { eventStatusPills } from "@/lib/events/query";
import { formatEventRange, formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HomeEvent } from "@/lib/types/home";

const BANNER_TONE: Record<"warn" | "danger" | "info", string> = {
  warn: "bg-primary-tint text-primary",
  danger: "bg-error-container text-error",
  info: "bg-quiet text-ink-secondary",
};

function hostedLabel(count: number): string {
  return count === 1 ? "1 event hosted" : count + " events hosted";
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-caption font-semibold text-ink-secondary">{children}</h2>;
}

function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3">
      <Icon className="mt-0.5 h-5 w-5 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
      <div className="min-w-0 text-body text-ink">{children}</div>
    </div>
  );
}

function EventHostRow({ event }: { event: HomeEvent }) {
  const host = event.hostProfile;
  if (!host) {
    return <p className="text-body text-ink-secondary">{event.host}</p>;
  }
  return (
    <div className="flex items-center gap-3">
      <Avatar name={host.name} src={host.avatarUrl} size="md" />
      <div className="min-w-0">
        <p className="text-body text-ink">{host.name}</p>
        <p className="text-caption text-ink-tertiary">
          {[host.tower, hostedLabel(host.eventsHosted)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function EventDetailsCard({
  event,
  backend,
  canManage,
}: {
  event: HomeEvent;
  backend: "demo" | "api";
  canManage: boolean;
}) {
  const venueHref = eventVenueHref(event);
  const spots = eventSpotsLabel(event);
  const ratio = eventCapacityRatio(event);

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-3">
        <DetailRow icon={Clock}>
          <p>{formatEventRange(event.startsAt, event.endsAt)}</p>
          {event.recurrenceLabel ? (
            <p className="mt-0.5 text-caption text-ink-tertiary">{event.recurrenceLabel}</p>
          ) : null}
        </DetailRow>
        <DetailRow icon={MapPin}>
          {venueHref ? (
            <Link href={venueHref} className="font-semibold text-primary">
              {event.location}
            </Link>
          ) : (
            event.location
          )}
        </DetailRow>
        <DetailRow icon={Home}>{eventAudienceLabel(event)}</DetailRow>
        {spots ? (
          <DetailRow icon={Users}>
            <p>{spots}</p>
            {ratio != null ? (
              <div
                className="mt-2 h-1 w-full overflow-hidden rounded-full bg-quiet"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={event.capacity}
                aria-valuenow={event.goingCount}
                aria-label={spots}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: ((ratio * 100).toFixed(0) + "%") }}
                />
              </div>
            ) : null}
          </DetailRow>
        ) : null}
        <DetailRow icon={Ticket}>{formatPriceInr(event.priceInr)}</DetailRow>
      </div>

      <div className="hidden md:block">
        <EventRsvpButton
          event={event}
          backend={backend}
          alreadyGoing={Boolean(event.viewerGoing)}
          fullWidth
          layout="card"
        />
      </div>
      <EventShareActions event={event} />
      {canManage ? (
        <>
          <div className="border-t border-hairline" />
          <EventManageActions eventId={event.id} canEdit={Boolean(event.isHost)} layout="stack" />
        </>
      ) : null}
    </Card>
  );
}

export function EventDetailScreen({
  event,
  backend,
}: {
  event: HomeEvent;
  backend: "demo" | "api";
}) {
  const banners = eventBanners(event);
  const pills = eventStatusPills(event).filter((pill) => pill !== "You're going");
  const categoryLabel = EVENT_CATEGORY_LABEL[event.category ?? "other"];
  const canManage = Boolean(event.isHost || event.isCommittee);
  const going = event.going ?? [];

  return (
    <>
      <EventDetailTopBar title={event.title} />
      <PageContainer className={EVENT_DETAIL_PAGE_PADDING}>
        <div className="mx-auto flex w-full max-w-content flex-col">
          <div className="-mx-4 sm:-mx-5 md:mx-0">
            <div className="relative overflow-hidden md:rounded-card">
              <EventCover
                title={event.title}
                imageUrl={event.imageUrl}
                category={event.category}
                frame="hero"
                sizes="(max-width: 1023px) 100vw, 1120px"
                priority
              />
              <span className="glass absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-caption font-semibold text-ink">
                {eventCoverPill(event)}
              </span>
            </div>
          </div>

          {banners.length > 0 ? (
            <div className="mt-8 space-y-2">
              {banners.map((banner) => (
                <p
                  key={banner.text}
                  className={cn("rounded-tile px-3 py-2 text-callout font-medium", BANNER_TONE[banner.tone])}
                >
                  {banner.text}
                </p>
              ))}
            </div>
          ) : null}

          <div className={cn("mt-8", EVENT_DETAIL_GRID)}>
            <div className={EVENT_DETAIL_HEADER}>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{categoryLabel}</Badge>
                {pills.map((pill) => (
                  <Badge key={pill}>{pill}</Badge>
                ))}
              </div>
              <h1 id="event-detail-title" className="text-title font-semibold text-ink lg:text-large-title">
                {event.title}
              </h1>
              <EventHostRow event={event} />
            </div>

            <aside className={EVENT_DETAIL_ASIDE}>
              <EventDetailsCard event={event} backend={backend} canManage={canManage} />
            </aside>

            <div className={EVENT_DETAIL_BODY}>
              {event.description ? (
                <section className="space-y-2">
                  <SectionHeading>About</SectionHeading>
                  <p className="text-body text-ink-secondary">{event.description}</p>
                </section>
              ) : null}

              {event.whatToBring ? (
                <section className="space-y-2">
                  <SectionHeading>What to bring</SectionHeading>
                  <p className="text-body text-ink-secondary">{event.whatToBring}</p>
                </section>
              ) : null}

              <section className="space-y-3">
                <SectionHeading>Who&apos;s going</SectionHeading>
                <div className="flex items-center gap-2">
                  {going.length > 0 ? <AvatarStack people={going} total={event.goingCount} size="xs" /> : null}
                  <p className="text-caption text-ink-secondary">
                    {event.goingCount} {event.goingCount === 1 ? "neighbour" : "neighbours"}
                  </p>
                </div>
                {event.attendees && event.attendees.length > 0 ? (
                  <ul className="space-y-1.5 text-callout text-ink-secondary">
                    {event.attendees.map((person) => {
                      const guestsForPerson = person.guestCount ?? 0;
                      const guestText =
                        guestsForPerson === 0
                          ? "no guests"
                          : guestsForPerson === 1
                            ? "1 guest"
                            : guestsForPerson + " guests";
                      const tower = person.tower ? " · " + person.tower : "";
                      const check = person.checkedIn ? "Checked in" : "Not checked in";
                      return (
                        <li key={person.id}>
                          {(person.fullName ?? person.name) + tower + " · " + guestText + " · " + check}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>

              {event.tags && event.tags.length > 0 ? (
                <section className="space-y-2">
                  <SectionHeading>Tags</SectionHeading>
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </PageContainer>
      <EventDetailMobileBar event={event} backend={backend} />
    </>
  );
}
