import * as React from "react";
import { cn } from "@/lib/utils";

interface ProfilePageLayoutProps {
  header: React.ReactNode;
  interests: React.ReactNode;
  events: React.ReactNode;
  bookings: React.ReactNode;
  rent: React.ReactNode;
  requests: React.ReactNode;
  groups: React.ReactNode;
  settings: React.ReactNode;
}

export function ProfilePageLayout(props: ProfilePageLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[70rem] space-y-section")}>
      {props.header}
      {props.interests}
      <div className="grid items-start gap-section lg:grid-cols-2 lg:gap-x-10">
        <div className="order-2 space-y-section lg:order-1">{props.events}</div>
        <div className="order-3 space-y-section lg:order-2">{props.bookings}</div>
        <div className="order-4 lg:order-2">{props.rent}</div>
        <div className="order-5 lg:order-2">{props.requests}</div>
        <div className="order-6 lg:order-1">{props.groups}</div>
      </div>
      <div className="order-7">{props.settings}</div>
    </div>
  );
}
