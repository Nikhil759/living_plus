import Link from "next/link";
import { AvatarStack } from "@/components/home/avatar-stack";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NeighbourMatch } from "@/lib/types/home";

export function NeighbourMatchCard({ match }: { match: NeighbourMatch }) {
  return (
    <Card as="section" className="space-y-4">
      <AvatarStack people={match.people} total={match.totalCount} size="md" />
      <div>
        <h3 className="text-headline text-ink">{match.title}</h3>
        <p className="mt-1 text-body text-ink-secondary">{match.description}</p>
      </div>
      <Link
        href={match.actionHref ?? "/community/new"}
        className={buttonVariants({ variant: "secondary", size: "md", className: "w-full" })}
      >
        {match.actionLabel || "Start a group"}
      </Link>
    </Card>
  );
}
