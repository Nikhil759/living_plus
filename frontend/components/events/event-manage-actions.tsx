import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STUBS = ["Cancel event", "Attendees and check-in", "Message attendees", "Duplicate"] as const;

export function EventManageActions({
  eventId,
  canEdit = false,
  layout = "wrap",
}: {
  eventId: string;
  canEdit?: boolean;
  layout?: "wrap" | "stack";
}) {
  const stack = layout === "stack";
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-secondary">Manage event</p>
      <div className={cn("flex gap-2", stack ? "flex-col" : "flex-wrap")}>
        {canEdit ? (
          <Link
            href={`/events/${eventId}/edit`}
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: stack ? "w-full" : undefined,
            })}
          >
            Edit
          </Link>
        ) : (
          <button
            type="button"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: stack ? "w-full" : undefined,
            })}
            disabled
            title="Coming in a later phase"
          >
            Edit
          </button>
        )}
        {STUBS.map((label) => (
          <button
            key={label}
            type="button"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: stack ? "w-full" : undefined,
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
