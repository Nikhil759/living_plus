import type {
  HelpDeskTicketCategory,
  HelpDeskTicketStatus,
  VendorCategory,
} from "@/lib/types/help-desk";
import { whatsappHref } from "@/lib/marketplace-labels";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  housekeeping: "House help & cleaning",
  electrical: "Electricians",
  plumbing: "Plumbers",
  lift: "Lift & common areas",
  security: "Security & gates",
  carpentry: "Carpentry",
  pest_control: "Pest control",
  other: "Other",
};

export const TICKET_CATEGORY_LABEL: Record<HelpDeskTicketCategory, string> = {
  maintenance: "Maintenance",
  lift: "Lift",
  water: "Water supply",
  security: "Security",
  amenity: "Amenity",
  noise: "Noise & nuisance",
  other: "Other",
};

export const TICKET_STATUS_LABEL: Record<HelpDeskTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function vendorContactHref(vendor: {
  phone?: string;
  whatsapp?: string;
}): string | undefined {
  if (vendor.whatsapp) return whatsappHref(vendor.whatsapp);
  if (vendor.phone) return `tel:${vendor.phone}`;
  return undefined;
}
