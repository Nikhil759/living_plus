export type FlatOpeningKind = "room_in_shared" | "flatmate_needed" | "full_flat_available";

export type FurnishingLevel = "furnished" | "semi_furnished" | "unfurnished";

export interface FlatOpeningContact {
  type: "whatsapp" | "phone";
  value: string;
}

export interface FlatOpening {
  id: string;
  kind: FlatOpeningKind;
  title: string;
  description: string;
  /** Monthly rent in INR. */
  rentInr: number;
  bhk: string;
  tower: string;
  flatNo?: string;
  furnishing: FurnishingLevel;
  /** ISO date when available from */
  availableFrom: string;
  postedBy: string;
  postedAt: string;
  preferences?: string;
  contact: FlatOpeningContact;
  status: "active" | "filled";
}
