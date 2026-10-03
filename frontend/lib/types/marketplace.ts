export type ListingCategory =
  | "furniture"
  | "electronics"
  | "kids"
  | "books"
  | "sports"
  | "home_kitchen";

export type ListingCondition = "new" | "like_new" | "good" | "fair";

/** Removed listings are never returned by the API. */
export type ListingStatus = "available" | "reserved" | "sold";

export type ListingContactMethod = "whatsapp" | "call";

export type ListingSort = "newest" | "price_asc" | "price_desc";

/** What a grid card and a My listings row need. */
export interface MarketplaceCard {
  id: string;
  title: string;
  priceInr: number;
  isFree: boolean;
  negotiable: boolean;
  condition: ListingCondition;
  category: ListingCategory;
  coverUrl: string | null;
  status: ListingStatus;
  tower: string | null;
  listedAt: string;
  isMine: boolean;
  /** Only ever true for committee members. */
  reported: boolean;
}

export interface MarketplaceSeller {
  firstName: string;
  avatarUrl: string | null;
  tower: string | null;
}

/** The seller's phone number is never part of this payload. */
export interface MarketplaceListing extends MarketplaceCard {
  description: string | null;
  photos: string[];
  pickupNote: string;
  contactMethod: ListingContactMethod;
  seller: MarketplaceSeller;
  canManage: boolean;
}

/** The viewer as a seller: used to preview their listing and to know if a phone is needed. */
export interface SellerProfile {
  firstName: string;
  avatarUrl: string | null;
  tower: string | null;
  hasPhone: boolean;
}
