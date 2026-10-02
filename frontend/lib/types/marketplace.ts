export type ListingCondition = "like_new" | "good" | "fair";

export type ListingCategory =
  | "furniture"
  | "electronics"
  | "kids"
  | "sports"
  | "appliances"
  | "other";

export type ListingStatus = "active" | "reserved" | "sold";

export interface ListingContact {
  type: "whatsapp" | "phone";
  value: string;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  category: ListingCategory;
  priceInr: number;
  condition: ListingCondition;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  sellerLabel: string;
  postedAt: string;
  contact: ListingContact;
  status: ListingStatus;
}
