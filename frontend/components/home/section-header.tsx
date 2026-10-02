import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
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
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-title text-ink">{title}</h2>
          {adornment}
        </div>
        {subtitle ? <p className="mt-0.5 text-caption text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-0.5 text-callout font-semibold text-primary"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
