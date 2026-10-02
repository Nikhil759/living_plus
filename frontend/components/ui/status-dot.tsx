import { cn } from "@/lib/utils";

export type StatusTone = "green" | "amber" | "red" | "quiet";

const tones: Record<StatusTone, string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  quiet: "bg-ink-tertiary",
};

export function StatusDot({
  tone = "quiet",
  className,
}: {
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", tones[tone], className)}
      aria-hidden="true"
    />
  );
}
