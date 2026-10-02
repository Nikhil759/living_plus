import type { ListingCategory, ListingCondition } from "@/lib/types/marketplace";
import type { BusinessCategory } from "@/lib/types/local-business";

export const LISTING_CATEGORY_LABEL: Record<ListingCategory, string> = {
  furniture: "Furniture",
  electronics: "Electronics",
  kids: "Kids",
  sports: "Sports",
  appliances: "Appliances",
  other: "Other",
};

export const LISTING_CONDITION_LABEL: Record<ListingCondition, string> = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

export const BUSINESS_CATEGORY_LABEL: Record<BusinessCategory, string> = {
  food: "Food & tiffin",
  home_services: "Home services",
  health: "Health",
  education: "Education",
  beauty: "Beauty",
  other: "Other",
};

export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  if (message) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}`;
}

export function listingContactHref(
  contact: { type: "whatsapp" | "phone"; value: string },
  message?: string,
): string {
  if (contact.type === "whatsapp") {
    return whatsappHref(contact.value, message);
  }
  const digits = contact.value.replace(/\D/g, "");
  const tel = contact.value.startsWith("+") ? contact.value : `+${digits}`;
  return `tel:${tel}`;
}
