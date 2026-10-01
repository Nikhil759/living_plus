import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewEventPage() {
  return (
    <AppPage title="Host an event">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Events
      </Link>
      <Card className="mt-4 space-y-3 p-5">
        <h2 className="text-headline-sm text-on-surface">Create an event</h2>
        <p className="text-body-md text-on-surface-variant">
          Event hosting and committee approval will connect to the API next. This route is wired
          from Home and Events so navigation never 404s.
        </p>
        <Link href="/events" className={buttonVariants({ variant: "soft", size: "md" })}>
          Browse events
        </Link>
      </Card>
    </AppPage>
  );
}
