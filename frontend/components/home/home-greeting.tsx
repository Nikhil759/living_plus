import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getGreeting } from "@/lib/format";
import type { Resident } from "@/lib/types/home";

export interface HomeGreetingProps {
  resident: Resident;
}

export function HomeGreeting({ resident }: HomeGreetingProps) {
  return (
    <section className="flex items-start justify-between gap-3 pt-1">
      <div className="min-w-0 space-y-1">
        <h1 className="text-headline-lg tracking-tight text-on-surface lg:text-headline-xl">
          {getGreeting()}, {resident.name}{" "}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {resident.society} · {resident.tower}, Flat {resident.flat}
          </span>
        </p>
      </div>
      {resident.roles[0] ? (
        <Badge tone="secondary" className="shrink-0 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
          {resident.roles[0]}
        </Badge>
      ) : null}
    </section>
  );
}
