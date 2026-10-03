import Link from "next/link";
import { EventDetailTopBar } from "@/components/events/event-detail-top-bar";
import { PageContainer } from "@/components/layout/page-container";

export default function EventNotFound() {
  return (
    <>
      <EventDetailTopBar />
      <PageContainer>
        <div className="mx-auto flex min-h-[50vh] w-full max-w-content flex-col items-start justify-center gap-4">
          <h1 className="text-title text-ink">This event doesn&apos;t exist or was removed</h1>
          <p className="text-body text-ink-secondary">
            It may have been cancelled, or the link could be out of date.
          </p>
          <Link href="/events" className="text-callout font-semibold text-primary">
            ← Events
          </Link>
        </div>
      </PageContainer>
    </>
  );
}
