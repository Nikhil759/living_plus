import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

export type AvatarTone = "primary" | "secondary" | "tertiary" | "neutral";
export type AvatarSize = "sm" | "md";

const tones: Record<AvatarTone, string> = {
  primary: "bg-primary-fixed text-primary",
  secondary: "bg-secondary-fixed text-on-secondary-fixed",
  tertiary: "bg-tertiary-fixed text-on-tertiary-fixed",
  neutral: "bg-surface-container-highest text-on-surface-variant",
};

const sizes: Record<AvatarSize, { box: string; px: number; text: string }> = {
  sm: { box: "h-8 w-8", px: 32, text: "text-label-md" },
  md: { box: "h-10 w-10", px: 40, text: "text-label-lg" },
};

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  /** Override the initials (used for "+4" overflow chips). */
  label?: string;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = "sm",
  tone = "primary",
  label,
  className,
}: AvatarProps) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        s.box,
        s.text,
        tones[tone],
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
