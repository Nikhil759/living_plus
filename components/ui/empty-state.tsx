import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Optional CTA, typically a Button or a Link styled with buttonVariants. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl bg-surface-container-low px-6 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-label-lg text-on-surface">{title}</p>
        {description ? (
          <p className="text-body-md text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
