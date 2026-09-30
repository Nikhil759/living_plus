import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "soft" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full transition-transform active:scale-95 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  solid: "bg-primary text-on-primary hover:bg-primary-container",
  soft: "bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-fixed-dim",
  ghost: "text-primary hover:bg-surface-container",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-label-sm",
  md: "px-4 py-2 text-label-md",
};

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

/** Use on `<Link>` / `<a>` when you need button styling without a `<button>`. */
export function buttonVariants({
  variant = "solid",
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
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
