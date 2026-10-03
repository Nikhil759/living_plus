import { notFound } from "next/navigation";
import { EventDetailScreen } from "@/components/events/event-detail-screen";
import { eventsWriteBackend, loadEventById } from "@/lib/data";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await loadEventById(id);
  if (!event) notFound();

  return <EventDetailScreen event={event} backend={eventsWriteBackend()} />;
}
