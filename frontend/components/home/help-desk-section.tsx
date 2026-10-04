import Link from "next/link";
import { AlertCircle, MessageSquarePlus, Phone } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { vendorCategoryIcon } from "@/lib/category-icons";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
  VENDOR_CATEGORY_LABEL,
  vendorContactHref,
} from "@/lib/help-desk-labels";
import type { HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import { formatFeedAge } from "@/lib/format";

const VENDOR_PREVIEW = 2;
const TICKET_PREVIEW = 2;

const SHORTCUTS = [
  { href: "/help-desk/report", label: "Report issue", icon: AlertCircle },
  { href: "/help-desk/feedback", label: "Feedback", icon: MessageSquarePlus },
  { href: "/help-desk/directory", label: "Directory", icon: Phone },
] as const;

/** A compact directory row for Home; the directory page keeps the full vendor card. */
function VendorListRow({ vendor }: { vendor: HelpDeskVendor }) {
  const href = vendorContactHref(vendor);
  const Icon = vendorCategoryIcon(vendor.category);
  return (
    <ListRow
      chevron={false}
      title={vendor.name}
      detail={`${VENDOR_CATEGORY_LABEL[vendor.category]}${vendor.hoursLabel ? ` · ${vendor.hoursLabel}` : ""}`}
      leading={
        <IconTile>
          <Icon />
        </IconTile>
      }
      trailing={
        href ? (
          <a
            href={href}
            aria-label={`Contact ${vendor.name}`}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "h-9 w-9 shrink-0 p-0" })}
            target={vendor.whatsapp ? "_blank" : undefined}
            rel={vendor.whatsapp ? "noopener noreferrer" : undefined}
          >
            <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        ) : undefined
      }
    />
  );
}

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

      <div className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-tile bg-card p-3 text-center shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
          >
            <IconTile>
              <Icon />
            </IconTile>
            <span className="text-callout font-semibold text-ink">{label}</span>
          </Link>
        ))}
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

      {vendorPreview.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-headline text-ink">House help and repairs</p>
            <Link href="/help-desk/directory" className="text-callout font-semibold text-primary">
              Full directory
            </Link>
          </div>
          <GroupedList>
            {vendorPreview.map((vendor) => (
              <VendorListRow key={vendor.id} vendor={vendor} />
            ))}
          </GroupedList>
        </div>
      ) : null}
    </section>
  );
}
