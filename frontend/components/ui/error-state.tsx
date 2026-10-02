import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <IconTile tone="quiet">
        <AlertCircle />
      </IconTile>
      <p className="text-body text-ink-secondary">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex items-center gap-0.5 text-callout font-semibold text-primary"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
