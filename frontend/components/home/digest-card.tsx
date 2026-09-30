import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Digest } from "@/lib/types/home";

export interface DigestCardProps {
  digest: Digest;
  href?: string;
}

export function DigestCard({ digest, href = "/announcements" }: DigestCardProps) {
  return (
    <Card as="section" className="space-y-3 p-4 lg:p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-label-lg text-on-surface">{digest.title}</p>
            <p className="truncate text-label-sm font-medium text-on-surface-variant">
              {digest.subtitle}
            </p>
          </div>
        </div>
        <Badge>Today</Badge>
      </header>

      <ul className="space-y-2 pt-1">
        {digest.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-2.5"
          >
            <span aria-hidden="true" className="mt-0.5 text-base">
              {item.emoji}
            </span>
            <p className="min-w-0 flex-1 text-body-md text-on-surface">
              <strong className="font-semibold">{item.lead}</strong> {item.body}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex justify-end pt-1">
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-label-md text-primary"
        >
          View all {digest.totalCount} announcements
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
}
