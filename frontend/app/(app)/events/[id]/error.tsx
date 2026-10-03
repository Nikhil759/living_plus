"use client";

import { AppPage } from "@/components/layout/app-page";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppPage title="Event">
      <ErrorState message="Could not load this event." action={{ onClick: reset, label: "Try again" }} />
    </AppPage>
  );
}
