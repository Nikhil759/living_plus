import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned link, e.g. "See all". */
  action?: { label: string; href: string };
  /** Extra node beside the title (e.g. a live indicator). */
  adornment?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  adornment,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-headline-sm text-on-surface">{title}</h2>
          {adornment}
        </div>
        {subtitle ? (
          <p className="text-body-sm text-on-surface-variant">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-0.5 py-1 text-label-sm text-primary"
        >
          {action.label}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
