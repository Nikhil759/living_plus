import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { vendorCategoryIcon } from "@/lib/category-icons";
import { VENDOR_CATEGORY_LABEL, vendorContactHref } from "@/lib/help-desk-labels";
import type { HelpDeskVendor } from "@/lib/types/help-desk";
import { cn } from "@/lib/utils";

export interface VendorRowProps {
  vendor: HelpDeskVendor;
  className?: string;
}

export function VendorRow({ vendor, className }: VendorRowProps) {
  const href = vendorContactHref(vendor);
  const Icon = vendorCategoryIcon(vendor.category);

  return (
    <div className={cn("flex items-start gap-3 rounded-tile bg-quiet p-3", className)}>
      <IconTile tone="quiet">
        <Icon />
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-headline text-ink">{vendor.name}</p>
          {vendor.societyApproved ? <Badge>Society list</Badge> : null}
        </div>
        <p className="text-caption text-ink-secondary">
          {VENDOR_CATEGORY_LABEL[vendor.category]}
          {vendor.hoursLabel ? ` · ${vendor.hoursLabel}` : ""}
        </p>
        {vendor.note ? <p className="mt-1 text-callout text-ink-secondary">{vendor.note}</p> : null}
      </div>
      {href ? (
        <a
          href={href}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          target={vendor.whatsapp ? "_blank" : undefined}
          rel={vendor.whatsapp ? "noopener noreferrer" : undefined}
        >
          <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Contact
        </a>
      ) : null}
    </div>
  );
}
