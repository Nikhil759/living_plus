import Link from "next/link";
import { ChevronRight, IndianRupee, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDueDate,
  formatRentAmount,
  RECURRING_STATUS_LABEL,
  RENT_STATUS_LABEL,
} from "@/lib/rent-labels";
import type { RentDashboardCurrent, RecurringRentSetup } from "@/lib/types/rent";

export interface RentSummaryCardProps {
  current: RentDashboardCurrent;
  recurring: RecurringRentSetup;
}

function statusTone(
  status: RentDashboardCurrent["status"],
): "primary" | "secondary" | "neutral" {
  if (status === "paid") return "neutral";
  if (status === "processing") return "secondary";
  return "primary";
}

export function RentSummaryCard({ current, recurring }: RentSummaryCardProps) {
  const showRecurringCta = recurring.status === "not_set";

  return (
    <Card as="section" className="space-y-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
            <IndianRupee className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-label-md text-on-surface">Rent</p>
            <p className="truncate text-label-sm text-on-surface-variant">{current.periodLabel}</p>
          </div>
        </div>
        <Badge tone={statusTone(current.status)}>{RENT_STATUS_LABEL[current.status]}</Badge>
      </div>

      <p className="text-headline-sm text-on-surface">{formatRentAmount(current.totalDueInr)}</p>
      <p className="text-body-sm text-on-surface-variant">
        Due {formatDueDate(current.dueDate)} · {current.tower}, {current.flat}
      </p>

      {recurring.status !== "not_set" ? (
        <p className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Auto-pay {RECURRING_STATUS_LABEL[recurring.status].toLowerCase()}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
        <Link
          href="/rent"
          className="inline-flex items-center gap-0.5 text-label-md text-primary"
        >
          Dashboard
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {showRecurringCta ? (
          <Link
            href="/rent/recurring"
            className="inline-flex items-center gap-0.5 text-label-md text-primary"
          >
            Set up auto-pay
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/rent/recurring"
            className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
          >
            Manage auto-pay
          </Link>
        )}
      </div>
    </Card>
  );
}
