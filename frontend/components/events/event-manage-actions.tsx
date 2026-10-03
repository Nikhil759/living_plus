import { buttonVariants } from "@/components/ui/button";

const ACTIONS = [
  "Edit",
  "Cancel event",
  "Attendees and check-in",
  "Message attendees",
  "Duplicate",
] as const;

export function EventManageActions() {
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-secondary">Manage event</p>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
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
