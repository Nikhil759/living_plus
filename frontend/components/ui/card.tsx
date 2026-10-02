import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  hover?: boolean;
}

export function Card({ as: Tag = "div", hover = false, className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card bg-card p-6 shadow-card",
        hover &&
          "transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover",
        className,
      )}
      {...props}
    />
  );
}
