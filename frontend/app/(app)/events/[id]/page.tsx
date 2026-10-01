import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import { getEventById } from "@/lib/mock/events";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <AppPage title="Event">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All events
      </Link>
      <Card className="mt-4 space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-headline-md text-on-surface">{event.title}</h1>
          <Badge tone={event.priceInr <= 0 ? "secondary" : "primary"}>
            {formatPriceInr(event.priceInr)}
          </Badge>
        </div>
        <p className="text-body-md text-on-surface-variant">{event.host}</p>
        <ul className="space-y-2 text-body-md text-on-surface">
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            {formatEventWhen(event.startsAt)}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {event.location}
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
            {event.goingCount} neighbours going
          </li>
        </ul>
        <button type="button" className={buttonVariants({ size: "md" })} disabled>
          {event.actionLabel} (coming soon)
        </button>
      </Card>
    </AppPage>
  );
}
