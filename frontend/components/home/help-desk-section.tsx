import Link from "next/link";
import { AlertCircle, MessageSquarePlus, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/home/section-header";
import { VendorRow } from "@/components/help-desk/vendor-row";
import { Badge } from "@/components/ui/badge";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
} from "@/lib/help-desk-labels";
import type { HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import { formatFeedAge } from "@/lib/format";

const VENDOR_PREVIEW = 2;
const TICKET_PREVIEW = 2;

export interface HelpDeskSectionProps {
  vendors: HelpDeskVendor[];
  tickets: HelpDeskTicket[];
}

export function HelpDeskSection({ vendors, tickets }: HelpDeskSectionProps) {
  const vendorPreview = vendors.slice(0, VENDOR_PREVIEW);
  const openTickets = tickets
    .filter((t) => t.status !== "resolved")
    .slice(0, TICKET_PREVIEW);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Help desk"
        subtitle="Report issues, feedback and vendor directory"
        action={{ label: "Open", href: "/help-desk" }}
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/help-desk/report"
          className="flex items-center gap-3 rounded-tile bg-card p-4 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
        >
          <IconTile>
            <AlertCircle />
          </IconTile>
          <span className="text-headline text-ink">Report issue</span>
        </Link>
        <Link
          href="/help-desk/feedback"
          className="flex items-center gap-3 rounded-tile bg-card p-4 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
        >
          <IconTile>
            <MessageSquarePlus />
          </IconTile>
          <span className="text-headline text-ink">Feedback</span>
        </Link>
        <Link
          href="/help-desk/directory"
          className="flex items-center gap-3 rounded-tile bg-card p-4 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
        >
          <IconTile>
            <Phone />
          </IconTile>
          <span className="text-headline text-ink">Directory</span>
        </Link>
      </div>

      {openTickets.length > 0 ? (
        <GroupedList>
          {openTickets.map((ticket) => (
            <ListRow
              key={ticket.id}
              href="/help-desk"
              title={ticket.title}
              detail={`${TICKET_CATEGORY_LABEL[ticket.category]} · ${formatFeedAge(ticket.createdAt)}`}
              trailing={
                <Badge dot={ticket.status === "open" ? "amber" : "green"}>
                  {TICKET_STATUS_LABEL[ticket.status]}
                </Badge>
              }
            />
          ))}
        </GroupedList>
      ) : null}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-headline text-ink">House help and repairs</p>
          <Link href="/help-desk/directory" className="text-callout font-semibold text-primary">
            Full directory
          </Link>
        </div>
        <div className="space-y-2">
          {vendorPreview.map((vendor) => (
            <VendorRow key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </Card>
    </section>
  );
}
