import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

export type AvatarTone = "primary" | "secondary" | "tertiary" | "neutral";
export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizes: Record<AvatarSize, { box: string; px: number; text: string }> = {
  xs: { box: "h-8 w-8", px: 32, text: "text-caption" },
  sm: { box: "h-9 w-9", px: 36, text: "text-caption" },
  md: { box: "h-10 w-10", px: 40, text: "text-callout" },
  lg: { box: "h-10 w-10", px: 40, text: "text-callout" },
};

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  label?: string;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = "sm",
  label,
  className,
}: AvatarProps) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-quiet text-ink-secondary",
        s.box,
        s.text,
        className,
      )}
      title={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={s.px}
          height={s.px}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-label={name}>{label ?? getInitials(name)}</span>
      )}
    </span>
  );
}
