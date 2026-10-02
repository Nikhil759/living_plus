import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { AvatarStack } from "@/components/home/avatar-stack";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEventWhen, formatPriceInr } from "@/lib/format";
import { loadEventById } from "@/lib/data";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await loadEventById(id);
  if (!event) notFound();

  return (
    <AppPage title="Event">
      <Link href="/events" className="text-callout font-semibold text-primary">
        All events
      </Link>
      <Card className="overflow-hidden p-0">
        {event.imageUrl ? (
          <div className="relative aspect-[16/10] bg-quiet">
            <Image
              src={event.imageUrl}
              alt={event.imageAlt ?? event.title}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
              priority
            />
            <span className="glass absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-caption font-semibold">
              {formatPriceInr(event.priceInr)}
            </span>
          </div>
        ) : null}
        <div className="space-y-4 p-6">
          <h1 className="text-title text-ink">{event.title}</h1>
          <p className="text-body text-ink-secondary">{event.host}</p>
          <ul className="space-y-2 text-body text-ink-secondary">
            <li className="flex items-center gap-2">
              <Clock className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {formatEventWhen(event.startsAt)}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {event.location}
            </li>
          </ul>
          <div className="flex items-center gap-2">
            {event.going ? (
              <AvatarStack people={event.going} total={event.goingCount} size="xs" />
            ) : null}
            <p className="text-caption text-ink-secondary">{event.goingCount} neighbours going</p>
          </div>
          <button type="button" className={buttonVariants({ variant: "primary" })} disabled>
            {event.actionLabel}
          </button>
        </div>
      </Card>
    </AppPage>
  );
}
