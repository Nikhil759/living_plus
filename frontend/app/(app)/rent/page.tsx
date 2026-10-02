import Link from "next/link";
import { CalendarClock, RefreshCw, Wallet } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { loadRentDashboard } from "@/lib/data";
import {
  formatDueDate,
  formatPaidOn,
  formatRentAmount,
  RECURRING_STATUS_LABEL,
  RENT_STATUS_LABEL,
} from "@/lib/rent-labels";
import type { RentPaymentStatus } from "@/lib/types/rent";

function statusDot(status: RentPaymentStatus): "green" | "amber" | "red" {
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  return "amber";
}

export default async function RentDashboardPage() {
  const { current, recurring, history } = await loadRentDashboard();

  const canPayNow = current.status === "due" || current.status === "overdue";

  return (
    <AppPage title="Rent payments">
      <p className="text-body text-ink-secondary">
        Track monthly rent and maintenance for your flat. Recurring setup ships with Razorpay later
        — demo data for now.
      </p>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption text-ink-secondary">{current.periodLabel}</p>
            <p className="text-large-title text-ink">{formatRentAmount(current.totalDueInr)}</p>
            <p className="text-callout text-ink-secondary">
              Rent {formatRentAmount(current.monthlyRentInr)} + maintenance{" "}
              {formatRentAmount(current.maintenanceInr)}
            </p>
          </div>
          <Badge dot={statusDot(current.status)}>{RENT_STATUS_LABEL[current.status]}</Badge>
        </div>
        <ul className="space-y-2 text-body text-ink-secondary">
          <li>
            {current.tower}, Flat {current.flat} · Landlord: {current.landlordName}
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
            Due by {formatDueDate(current.dueDate)}
          </li>
          {current.paidAt ? <li>Paid on {formatPaidOn(current.paidAt)}</li> : null}
        </ul>
        <div className="flex flex-wrap gap-2">
          {canPayNow ? (
            <button type="button" className={buttonVariants({ variant: "primary" })} disabled>
              Pay now (coming soon)
            </button>
          ) : null}
          <Link href="/rent/recurring" className={buttonVariants({ variant: "secondary" })}>
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Recurring payments
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-headline text-ink">Auto-pay</h2>
          <Badge dot={recurring.status === "active" ? "green" : undefined}>
            {RECURRING_STATUS_LABEL[recurring.status]}
          </Badge>
        </div>
        {recurring.status === "active" && recurring.paymentLabel ? (
          <p className="text-body text-ink-secondary">
            {recurring.paymentLabel}
            {recurring.nextDebitDate
              ? ` · Next debit ${formatDueDate(recurring.nextDebitDate)}`
              : ""}
          </p>
        ) : (
          <p className="text-body text-ink-secondary">
            Set up UPI AutoPay or a bank e-mandate so rent is tracked each month.
          </p>
        )}
        <Link href="/rent/recurring" className="text-callout font-semibold text-primary">
          {recurring.status === "not_set" ? "Set up recurring" : "Manage recurring"}
        </Link>
      </Card>

      <section className="space-y-4">
        <SectionHeader title="Payment history" adornment={<Wallet className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} />} />
        <GroupedList>
          {history.map((row) => (
            <ListRow
              key={row.id}
              title={row.periodLabel}
              detail={`${formatPaidOn(row.paidAt)} · ${row.method}${row.receiptId ? ` · ${row.receiptId}` : ""}`}
              trailing={
                <span className="text-headline text-ink">{formatRentAmount(row.amountInr)}</span>
              }
              chevron={false}
            />
          ))}
        </GroupedList>
      </section>
    </AppPage>
  );
}
