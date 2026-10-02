import Link from "next/link";
import { ChevronRight, IndianRupee, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import {
  formatDueDate,
  formatRentAmount,
  RECURRING_STATUS_LABEL,
  RENT_STATUS_LABEL,
} from "@/lib/rent-labels";
import type { RentDashboard, RentPaymentStatus } from "@/lib/types/rent";

interface ProfileRentSectionProps {
  rent: Pick<RentDashboard, "current" | "recurring">;
}

function statusDot(status: RentPaymentStatus): "green" | "amber" | "red" {
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  return "amber";
}

export function ProfileRentSection({ rent }: ProfileRentSectionProps) {
  const { current, recurring } = rent;
  const showRecurringCta = recurring.status === "not_set";

  return (
    <section className="space-y-4">
      <SectionHeader title="Rent dashboard" action={{ label: "Full dashboard", href: "/rent" }} />
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <IconTile>
            <IndianRupee />
          </IconTile>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-headline text-ink">Rent</p>
              <Badge dot={statusDot(current.status)}>{RENT_STATUS_LABEL[current.status]}</Badge>
            </div>
            <p className="text-caption text-ink-secondary">{current.periodLabel}</p>
            <p className="text-title text-ink">{formatRentAmount(current.totalDueInr)}</p>
            <p className="text-callout text-ink-secondary">
              Due {formatDueDate(current.dueDate)} · {current.tower}, {current.flat}
            </p>
          </div>
        </div>

        {recurring.status !== "not_set" ? (
          <p className="flex items-center gap-1.5 text-caption text-ink-secondary">
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Auto-pay {RECURRING_STATUS_LABEL[recurring.status].toLowerCase()}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-outline-variant/30 pt-4">
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
    </section>
  );
}
