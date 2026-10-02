"use client";

import { AppPage } from "@/components/layout/app-page";
import { ErrorState } from "@/components/ui/error-state";

export function ScreenError({
  title,
  message = "Something went wrong loading this page.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <AppPage title={title}>
      <ErrorState message={message} action={{ href: "/home", label: "Back to Home" }} />
    </AppPage>
  );
}
