import * as React from "react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
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
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <IconTile>{icon}</IconTile>
      <p className="text-body text-ink-secondary">{title}</p>
      {description ? <p className="sr-only">{description}</p> : null}
      {action}
    </div>
  );
}
