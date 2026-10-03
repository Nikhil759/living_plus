export type BusinessCategory =
  | "food"
  | "tuition"
  | "childcare"
  | "pet_care"
  | "art"
  | "wellness"
  | "home_services";

export type BusinessAvailability = "taking_orders" | "fully_booked" | "on_break";

/** Removed businesses are never returned by the API. */
export type BusinessReviewStatus = "pending" | "approved" | "rejected";

export type OfferingUnit = "each" | "per_meal" | "per_hour" | "per_day" | "per_month";

export type BusinessServes = "within_society" | "all_towers";

export type BusinessContactMethod = "whatsapp" | "call";

export type BusinessSort = "recommended" | "newest";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface StartingPrice {
  priceInr: number;
  unit: OfferingUnit;
}

/** What a directory card, a Home card and an owner's row need. */
export interface BusinessCard {
  id: string;
  name: string;
  category: BusinessCategory;
  tagline: string;
  coverUrl: string;
  ownerFirstName: string;
  tower: string | null;
  startingPrice: StartingPrice | null;
  recommendationCount: number;
  availability: BusinessAvailability;
  reviewStatus: BusinessReviewStatus;
  isFeatured: boolean;
  isMine: boolean;
  createdAt: string;
}

export interface BusinessOffering {
  name: string;
  priceInr: number;
  unit: OfferingUnit;
  note: string | null;
}

export interface BusinessOwner {
  firstName: string;
  avatarUrl: string | null;
  tower: string | null;
  memberSince: number;
}

export interface BusinessUpdate {
  text: string;
  createdAt: string;
}

export interface BusinessRecommendation {
  id: string;
  firstName: string;
  tower: string | null;
  note: string;
  createdAt: string;
}

export interface BusinessViewer {
  following: boolean;
  recommended: boolean;
  myNote: string | null;
}

/** The owner's phone number is never part of this payload. */
export interface BusinessDetail extends BusinessCard {
  about: string | null;
  photos: string[];
  offerings: BusinessOffering[];
  timings: string;
  days: Weekday[];
  serves: BusinessServes;
  contactMethod: BusinessContactMethod;
  owner: BusinessOwner;
  latestUpdate: BusinessUpdate | null;
  recommendations: BusinessRecommendation[];
  viewer: BusinessViewer;
  /** Owner and committee only. */
  followerCount: number | null;
  canManage: boolean;
  /** Owner and committee only. */
  rejectionReason: string | null;
  canReview: boolean;
  canModerate: boolean;
}
