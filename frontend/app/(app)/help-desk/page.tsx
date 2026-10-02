import Link from "next/link";
import {
  AlertCircle,
  LifeBuoy,
  MessageSquarePlus,
  Phone,
} from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { VendorRow } from "@/components/help-desk/vendor-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { loadHelpDeskTickets, loadHelpDeskVendors } from "@/lib/data";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
} from "@/lib/help-desk-labels";
import { formatFeedAge } from "@/lib/format";

const QUICK_ACTIONS = [
  {
    href: "/help-desk/report",
    label: "Report an issue",
    description: "Lift, water, security, amenities",
    icon: AlertCircle,
  },
  {
    href: "/help-desk/feedback",
    label: "Give feedback",
    description: "Suggestions for the committee and app",
    icon: MessageSquarePlus,
  },
  {
    href: "/help-desk/directory",
    label: "Vendor directory",
    description: "House help, electricians, plumbers",
    icon: Phone,
  },
] as const;

export default async function HelpDeskPage() {
  const [tickets, vendors] = await Promise.all([
    loadHelpDeskTickets(),
    loadHelpDeskVendors(),
  ]);

  return (
    <AppPage title="Help desk">
      <p className="text-body text-ink-secondary">
        Raise tickets for society issues, share feedback, and call approved vendors.
      </p>

      <ul className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full flex-col gap-2 rounded-card bg-card p-5 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
            >
              <IconTile>
                <Icon />
              </IconTile>
              <p className="text-headline text-ink">{label}</p>
              <p className="text-callout text-ink-secondary">{description}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <SectionHeader title="My requests" adornment={<LifeBuoy className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} />} />
        <GroupedList>
          {tickets.map((ticket) => (
            <ListRow
              key={ticket.id}
              title={ticket.title}
              detail={`${TICKET_CATEGORY_LABEL[ticket.category]} · opened ${formatFeedAge(ticket.createdAt)}`}
              chevron={false}
              trailing={
                <Badge
                  dot={
                    ticket.status === "resolved"
                      ? "green"
                      : ticket.status === "open"
                        ? "amber"
                        : "amber"
                  }
                >
                  {TICKET_STATUS_LABEL[ticket.status]}
                </Badge>
              }
            />
          ))}
        </GroupedList>
      </section>

      <Card className="space-y-3">
        <SectionHeader
          title="Society vendor directory"
          action={{ label: "See all", href: "/help-desk/directory" }}
        />
        <p className="text-callout text-ink-secondary">
          Empanelled help for flats and common areas — distinct from local business ads.
        </p>
        <div className="space-y-2">
          {vendors.slice(0, 4).map((vendor) => (
            <VendorRow key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </Card>
    </AppPage>
  );
}
