import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Tag, Users } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { AvatarStack } from "@/components/home/avatar-stack";
import { EventCover } from "@/components/events/event-cover";
import { EventManageActions } from "@/components/events/event-manage-actions";
import { EventRsvpButton } from "@/components/events/event-rsvp-button";
import { EventShareActions } from "@/components/events/event-share-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "@/lib/events/categories";
import {
  eventBanners,
  eventCapacityLabel,
  eventGuestLabel,
  eventVenueHref,
} from "@/lib/events/detail";
import { eventStatusPills } from "@/lib/events/query";
import { eventsWriteBackend, loadEventById } from "@/lib/data";
import { formatEventRange, formatPriceInr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

const BANNER_TONE: Record<"warn" | "danger" | "info", string> = {
  warn: "bg-primary-tint text-primary",
  danger: "bg-error-container text-error",
  info: "bg-quiet text-ink-secondary",
};

function hostedLabel(count: number): string {
  return count === 1 ? "1 event hosted" : `${count} events hosted`;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await loadEventById(id);
  if (!event) notFound();

  const backend = eventsWriteBackend();
  const banners = eventBanners(event);
  const pills = eventStatusPills(event);
  const venueHref = eventVenueHref(event);
  const capacity = eventCapacityLabel(event);
  const guests = eventGuestLabel(event.guestLimit);
  const host = event.hostProfile;
  const typeLabel = EVENT_TYPE_LABEL[event.eventType ?? "free"];
  const categoryLabel = EVENT_CATEGORY_LABEL[event.category ?? "other"];
  const canManage = Boolean(event.isHost || event.isCommittee);

  return (
    <AppPage title="Event">
      <Link href="/events" className="text-callout font-semibold text-primary">
        All events
      </Link>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="relative">
          <EventCover
            title={event.title}
            imageUrl={event.imageUrl}
            category={event.category}
            sizes="(max-width: 768px) 100vw, 720px"
            priority
          />
          <span className="glass absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-caption font-semibold text-ink">
            {formatPriceInr(event.priceInr)}
          </span>
        </div>
        <div className="space-y-4 p-6">
          {banners.length > 0 ? (
            <div className="space-y-2">
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

          <div className="flex flex-wrap gap-1.5">
            <Badge>{typeLabel}</Badge>
            <Badge>{categoryLabel}</Badge>
            {pills.map((pill) => (
              <Badge key={pill}>{pill}</Badge>
            ))}
          </div>

          <h1 className="text-title text-ink">{event.title}</h1>

          {host ? (
            <div className="flex items-center gap-3">
              <Avatar name={host.name} src={host.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="text-body text-ink">{host.name}</p>
                <p className="text-caption text-ink-tertiary">
                  {[host.tower, hostedLabel(host.eventsHosted)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-body text-ink-secondary">{event.host}</p>
          )}

          <ul className="space-y-2 text-body text-ink-secondary">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>
                {formatEventRange(event.startsAt, event.endsAt)}
                {event.recurrenceLabel ? (
                  <span className="mt-0.5 block text-caption text-ink-tertiary">{event.recurrenceLabel}</span>
                ) : null}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {venueHref ? (
                <Link href={venueHref} className="font-semibold text-primary">
                  {event.location}
                </Link>
              ) : (
                event.location
              )}
            </li>
            {capacity ? (
              <li className="flex items-center gap-2">
                <Users className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                {capacity}
              </li>
            ) : null}
          </ul>

          {guests ? <p className="text-caption text-ink-secondary">{guests}</p> : null}

          {event.description ? <p className="text-body text-ink-secondary">{event.description}</p> : null}

          {event.whatToBring ? (
            <div>
              <p className="text-caption font-medium text-ink-secondary">What to bring</p>
              <p className="mt-1 text-body text-ink-secondary">{event.whatToBring}</p>
            </div>
          ) : null}

          {event.tags && event.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-4 w-4 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              {event.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {event.going && event.going.length > 0 ? (
              <AvatarStack people={event.going} total={event.goingCount} size="xs" />
            ) : null}
            <p className="text-caption text-ink-secondary">{event.goingCount} neighbours going</p>
          </div>

          {event.attendees && event.attendees.length > 0 ? (
            <div className="space-y-2">
              <p className="text-caption font-medium text-ink-secondary">Attendees</p>
              <ul className="space-y-1.5 text-callout text-ink-secondary">
                {event.attendees.map((person) => {
                  const guestsForPerson = person.guestCount ?? 0;
                  const guestText =
                    guestsForPerson === 0
                      ? "no guests"
                      : guestsForPerson === 1
                        ? "1 guest"
                        : `${guestsForPerson} guests`;
                  return (
                    <li key={person.id}>
                      {person.fullName ?? person.name}
                      {person.tower ? ` · ${person.tower}` : ""}
                      {` · ${guestText}`}
                      {` · ${person.checkedIn ? "Checked in" : "Not checked in"}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <EventShareActions event={event} />
          <EventRsvpButton event={event} backend={backend} alreadyGoing={Boolean(event.viewerGoing)} />
          {canManage ? <EventManageActions /> : null}
        </div>
      </Card>
    </AppPage>
  );
}
