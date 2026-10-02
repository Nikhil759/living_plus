import type { FlatOpeningKind, FurnishingLevel } from "@/lib/types/flat-opening";

export const FLAT_OPENING_KIND_LABEL: Record<FlatOpeningKind, string> = {
  room_in_shared: "Room available",
  flatmate_needed: "Flatmate needed",
  full_flat_available: "Full flat available",
};

export const FURNISHING_LABEL: Record<FurnishingLevel, string> = {
  furnished: "Furnished",
  semi_furnished: "Semi-furnished",
  unfurnished: "Unfurnished",
};

export function formatRentInr(rentInr: number): string {
  return `${new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rentInr)}/mo`;
}

export function formatAvailableFrom(isoDate: string): string {
  const date = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
