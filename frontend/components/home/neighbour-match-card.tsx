import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarStack } from "@/components/home/avatar-stack";
import type { NeighbourMatch } from "@/lib/types/home";

export interface NeighbourMatchCardProps {
  match: NeighbourMatch;
  href?: string;
}

export function NeighbourMatchCard({
  match,
  href = "/community/new",
}: NeighbourMatchCardProps) {
  return (
    <Card as="section" className="relative space-y-3.5 overflow-hidden p-4 lg:p-5 xl:space-y-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-primary-fixed/40 blur-2xl"
      />

      {/* Wide layouts: text left, avatars right. The narrow xl side rail stacks them. */}
      <div className="relative flex items-start justify-between gap-3 xl:flex-col-reverse xl:justify-end xl:gap-4">
        <div className="min-w-0 max-w-[70%] space-y-1 xl:max-w-none">
          <span className="text-label-sm font-semibold uppercase tracking-wider text-primary">
            {match.label}
          </span>
          <h3 className="text-headline-sm text-on-surface">{match.title}</h3>
          <p className="text-body-md text-on-surface-variant">{match.description}</p>
        </div>
        <AvatarStack
          people={match.people}
          total={match.totalCount}
          className="shrink-0 pt-1 xl:pt-0"
        />
      </div>

      <div className="relative flex items-center justify-between gap-3 pt-1 xl:flex-col xl:items-stretch xl:pt-0">
        <span className="min-w-0 text-label-sm font-medium text-on-surface-variant">
          {match.activeSummary}
        </span>
        <Link
          href={href}
          className={buttonVariants({ size: "md", className: "shrink-0 xl:w-full xl:py-2.5" })}
        >
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
          {match.actionLabel}
        </Link>
      </div>
    </Card>
  );
}
