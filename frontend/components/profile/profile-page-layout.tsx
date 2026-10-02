import * as React from "react";
import { cn } from "@/lib/utils";

interface ProfilePageLayoutProps {
  identity: React.ReactNode;
  rent: React.ReactNode;
  activity: React.ReactNode;
  settings: React.ReactNode;
}

/**
 * Desktop: profile card top-left with open canvas on the right; rent + activity share row two.
 */
export function ProfilePageLayout({ identity, rent, activity, settings }: ProfilePageLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-content")}>
      <div className="grid items-start gap-section lg:grid-cols-2 lg:gap-x-8 xl:gap-x-10">
        <div className="min-w-0">{identity}</div>
        <div className="hidden min-w-0 lg:block" aria-hidden />
        <div className="min-w-0">{rent}</div>
        <div className="flex min-w-0 flex-col gap-section">{activity}</div>
        <div className="min-w-0 lg:col-span-2">{settings}</div>
      </div>
    </div>
  );
}
