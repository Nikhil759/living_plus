import Link from "next/link";
import { Building2, Smartphone } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { loadRentDashboard } from "@/lib/data";
import {
  formatDueDate,
  formatRentAmount,
  RECURRING_METHOD_LABEL,
  RECURRING_STATUS_LABEL,
} from "@/lib/rent-labels";

export default async function RentRecurringPage() {
  const { current, recurring } = await loadRentDashboard();

  return (
    <AppPage title="Recurring rent">
      <Link href="/rent" className="text-callout font-semibold text-primary">
        Rent dashboard
      </Link>

      <Card className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-headline text-ink">Current plan</h2>
          <Badge dot={recurring.status === "active" ? "green" : undefined}>
            {RECURRING_STATUS_LABEL[recurring.status]}
          </Badge>
        </div>
        <p className="text-body text-ink-secondary">
          {formatRentAmount(current.totalDueInr)} on day 5 each month for {current.tower}, Flat{" "}
          {current.flat}. You&apos;ll get a reminder before each debit and a receipt in history.
        </p>
      </Card>

      <div className="space-y-3">
        <h2 className="text-title text-ink">Choose a method</h2>
        <Card className="flex items-start gap-3">
          <IconTile>
            <Smartphone />
          </IconTile>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-headline text-ink">{RECURRING_METHOD_LABEL.upi_autopay}</p>
            <p className="text-callout text-ink-secondary">
              NPCI UPI mandate — approve once in your UPI app, then auto-debit on due date.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <IconTile>
            <Building2 />
          </IconTile>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-headline text-ink">{RECURRING_METHOD_LABEL.bank_mandate}</p>
            <p className="text-callout text-ink-secondary">
              e-NACH bank mandate for higher limits. Useful if rent exceeds UPI caps.
            </p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-headline text-ink">Setup steps (preview)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-body text-ink-secondary">
          <li>Confirm amount and debit date ({formatDueDate(current.dueDate)} each month)</li>
          <li>Verify tenant and landlord details with society records</li>
          <li>Complete Razorpay mandate flow (test mode in demo)</li>
          <li>Track status on the rent dashboard and pause anytime</li>
        </ol>
        <button type="button" className={buttonVariants({ variant: "primary" })} disabled>
          Continue setup (coming soon)
        </button>
        <p className="text-caption text-ink-tertiary">
          Production will use Razorpay subscriptions or UPI mandates with landlord payout via Route
          later.
        </p>
      </Card>
    </AppPage>
  );
}
