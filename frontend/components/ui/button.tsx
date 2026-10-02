import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "tertiary" | "solid" | "soft" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold " +
  "transition-transform duration-premium ease-premium " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "disabled:pointer-events-none disabled:opacity-40 " +
  "motion-safe:active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "rounded-full bg-primary text-white hover:bg-primary-pressed",
  secondary: "rounded-full bg-primary-tint text-primary hover:bg-primary-tint",
  tertiary: "rounded-none bg-transparent text-primary hover:opacity-80",
  solid: "rounded-full bg-primary text-white hover:bg-primary-pressed",
  soft: "rounded-full bg-primary-tint text-primary hover:bg-primary-tint",
  ghost: "rounded-none bg-transparent text-primary hover:opacity-80",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-callout",
  md: "h-11 px-5 text-headline",
};

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  chevron?: boolean;
}

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {}

export function Button({
  variant,
  size,
  className,
  type = "button",
  chevron,
  children,
  ...props
}: ButtonProps) {
  const resolved = variant ?? "primary";
  const showChevron = chevron ?? (resolved === "tertiary" || resolved === "ghost");

  return (
    <button
      type={type}
      className={buttonVariants({ variant: resolved, size, className })}
      {...props}
    >
      {children}
      {showChevron ? <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /> : null}
    </button>
  );
}
