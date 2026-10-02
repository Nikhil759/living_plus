import Link from "next/link";
import { ChevronRight, IndianRupee, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import {
  formatDueDate,
  formatRentAmount,
  RECURRING_STATUS_LABEL,
  RENT_STATUS_LABEL,
} from "@/lib/rent-labels";
import type { RecurringRentSetup, RentDashboardCurrent, RentPaymentStatus } from "@/lib/types/rent";

export interface RentSummaryCardProps {
  current: RentDashboardCurrent;
  recurring: RecurringRentSetup;
}

function statusDot(status: RentPaymentStatus): "green" | "amber" | "red" {
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  return "amber";
}

export function RentSummaryCard({ current, recurring }: RentSummaryCardProps) {
  const showRecurringCta = recurring.status === "not_set";

  return (
    <Card as="section" className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile>
            <IndianRupee />
          </IconTile>
          <div className="min-w-0">
            <p className="text-headline text-ink">Rent</p>
            <p className="truncate text-caption text-ink-secondary">{current.periodLabel}</p>
          </div>
        </div>
        <Badge dot={statusDot(current.status)}>{RENT_STATUS_LABEL[current.status]}</Badge>
      </div>

      <div>
        <p className="text-title text-ink">{formatRentAmount(current.totalDueInr)}</p>
        <p className="mt-1 text-callout text-ink-secondary">
          Due {formatDueDate(current.dueDate)} · {current.tower}, {current.flat}
        </p>
      </div>

      {recurring.status !== "not_set" ? (
        <p className="flex items-center gap-1.5 text-caption text-ink-secondary">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Auto-pay {RECURRING_STATUS_LABEL[recurring.status].toLowerCase()}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/rent"
          className="inline-flex items-center gap-0.5 text-callout font-semibold text-primary"
        >
          Dashboard
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link
          href="/rent/recurring"
          className={
            showRecurringCta
              ? "inline-flex items-center gap-0.5 text-callout font-semibold text-primary"
              : "text-caption text-ink-secondary"
          }
        >
          {showRecurringCta ? "Set up auto-pay" : "Manage auto-pay"}
          {showRecurringCta ? (
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          ) : null}
        </Link>
      </div>
    </Card>
  );
}
