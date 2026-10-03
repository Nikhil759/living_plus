import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTIONS = [
  "Edit",
  "Cancel event",
  "Attendees and check-in",
  "Message attendees",
  "Duplicate",
] as const;

export function EventManageActions({ layout = "wrap" }: { layout?: "wrap" | "stack" }) {
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-secondary">Manage event</p>
      <div className={cn("flex gap-2", layout === "stack" ? "flex-col" : "flex-wrap")}>
        {ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: layout === "stack" ? "w-full" : undefined,
            })}
            disabled
            title="Coming in a later phase"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
