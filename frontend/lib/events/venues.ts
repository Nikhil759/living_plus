import type { Amenity, Resident } from "@/lib/types/home";

export const VENUE_OTHER = "__other__";
export const VENUE_MY_FLAT = "__my_flat__";

export interface VenueOption {
  /** Stable key. Society places use their label; special rows use the constants above. */
  value: string;
  label: string;
  emoji: string;
  hint?: string;
  /** Set for the society's own amenities, so the event is linked to the space. */
  amenityId?: string;
  group: "flat" | "society" | "other";
}

/** Shared spaces most gated societies have. Amenities from the society are listed first. */
const COMMON_VENUES: ReadonlyArray<{ label: string; emoji: string }> = [
  { label: "Clubhouse", emoji: "🏛️" },
  { label: "Community Hall", emoji: "🏠" },
  { label: "Amphitheatre", emoji: "🎭" },
  { label: "Central Lawn", emoji: "🌳" },
  { label: "Clubhouse Terrace", emoji: "🌇" },
  { label: "Kids Play Area", emoji: "🛝" },
  { label: "Jogging Track", emoji: "🏃" },
  { label: "Main Gate", emoji: "🚪" },
  { label: "Parking Lot", emoji: "🅿️" },
];

/** Flat label other neighbours will see on the event, e.g. "Tower C, Flat 702". */
export function myFlatLabel(resident?: Pick<Resident, "tower" | "flat">): string | null {
  const tower = resident?.tower?.trim();
  const flat = resident?.flat?.trim();
  if (!flat) return null;
  return tower ? `${tower}, Flat ${flat}` : `Flat ${flat}`;
}

export function buildVenueOptions(
  amenities: ReadonlyArray<Pick<Amenity, "name" | "emoji"> & { id?: string }> = [],
  resident?: Pick<Resident, "tower" | "flat">,
): VenueOption[] {
  const options: VenueOption[] = [];
  const flatLabel = myFlatLabel(resident);
  if (flatLabel) {
    options.push({
      value: VENUE_MY_FLAT,
      label: "My flat",
      emoji: "🏡",
      hint: flatLabel,
      group: "flat",
    });
  }

  const seen = new Set<string>();
  const addSociety = (label: string, emoji: string, amenityId?: string) => {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value: label.trim(), label: label.trim(), emoji, amenityId, group: "society" });
  };
  for (const amenity of amenities) addSociety(amenity.name, amenity.emoji || "📍", amenity.id);
  for (const venue of COMMON_VENUES) addSociety(venue.label, venue.emoji);

  options.push({
    value: VENUE_OTHER,
    label: "Somewhere else",
    emoji: "✏️",
    hint: "Type a new place",
    group: "other",
  });
  return options;
}

export interface VenueSelection {
  key: string;
  other: string;
}

/** Map a saved location string back onto the dropdown (used when editing an event). */
export function resolveVenue(location: string, options: ReadonlyArray<VenueOption>): VenueSelection {
  const cleaned = location.trim();
  if (!cleaned) return { key: "", other: "" };
  const lowered = cleaned.toLowerCase();
  for (const option of options) {
    if (option.group === "other") continue;
    const stored = (option.group === "flat" ? option.hint : option.label)?.toLowerCase();
    if (stored === lowered) return { key: option.value, other: "" };
  }
  return { key: VENUE_OTHER, other: cleaned };
}

/** The text that is saved on the event for the current dropdown choice. */
export function venueLocation(
  selection: VenueSelection,
  options: ReadonlyArray<VenueOption>,
): string {
  if (selection.key === VENUE_OTHER) return selection.other.trim();
  const match = options.find((option) => option.value === selection.key);
  if (!match) return "";
  return match.group === "flat" ? (match.hint ?? "") : match.label;
}

/** The amenity linked to the current dropdown choice, if it is one of the society's spaces. */
export function venueAmenityId(
  selection: VenueSelection,
  options: ReadonlyArray<VenueOption>,
): string | undefined {
  return options.find((option) => option.value === selection.key)?.amenityId;
}

/** A preselected venue from a link like /events/new?venue=Community%20Hall. */
export function presetVenueSelection(
  name: string | undefined,
  options: ReadonlyArray<VenueOption>,
): VenueSelection {
  const match = name ? resolveVenue(name, options) : { key: "", other: "" };
  return match.key === VENUE_OTHER ? { key: "", other: "" } : match;
}
