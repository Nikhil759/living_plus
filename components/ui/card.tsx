import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
}

export function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl bg-surface-container-lowest shadow-card",
        className,
      )}
      {...props}
    />
  );
}
