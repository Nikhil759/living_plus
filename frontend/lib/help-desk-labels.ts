import type {
  HelpDeskCategory,
  HelpDeskIssueStatus,
  FeedbackTopic,
  VendorCategory,
} from "@/lib/types/help-desk";
import { whatsappHref } from "@/lib/marketplace-labels";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  housekeeping: "House help",
  electrical: "Electricians",
  plumbing: "Plumbers",
  carpentry: "Carpenters",
  pest_control: "Pest control",
  appliance: "Appliance repair",
  security: "Security",
  other: "Others",
};

export const VENDOR_CATEGORY_ORDER: VendorCategory[] = [
  "housekeeping",
  "electrical",
  "plumbing",
  "carpentry",
  "pest_control",
  "appliance",
  "security",
  "other",
];

export const TICKET_CATEGORY_LABEL: Record<HelpDeskCategory, string> = {
  lift: "Lift",
  water: "Water",
  electricity: "Electricity",
  plumbing: "Plumbing",
  security: "Security",
  cleanliness: "Cleanliness",
  parking: "Parking",
  amenity: "Amenity",
  noise: "Noise",
  other: "Other",
};

export const TICKET_STATUS_LABEL: Record<HelpDeskIssueStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const FEEDBACK_TOPIC_LABEL: Record<FeedbackTopic, string> = {
  committee: "Committee",
  app: "App",
  suggestion: "Suggestion",
};

export const REPORT_CATEGORIES: HelpDeskCategory[] = [
  "lift",
  "water",
  "electricity",
  "plumbing",
  "security",
  "cleanliness",
  "parking",
  "amenity",
  "noise",
  "other",
];

export function vendorContactHref(vendor: {
  phone?: string;
  whatsapp?: string;
}): string | undefined {
  if (vendor.whatsapp) return whatsappHref(vendor.whatsapp);
  if (vendor.phone) return `tel:${vendor.phone}`;
  return undefined;
}
