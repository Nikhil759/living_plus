export type BusinessCategory =
  | "food"
  | "home_services"
  | "health"
  | "education"
  | "beauty"
  | "other";

export type BusinessListingType = "community_pick" | "sponsored";

export interface LocalBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  emoji: string;
  tagline: string;
  description: string;
  phone?: string;
  whatsapp?: string;
  addressHint: string;
  hours?: string;
  listingType: BusinessListingType;
  distanceLabel?: string;
}
