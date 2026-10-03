import { STATIC_AMENITY_DETAILS } from "@/lib/amenities/static-catalog";
import type { AmenityDetail } from "@/lib/types/amenities";
import announcementsJson from "@/data/announcements.json";
import communityJson from "@/data/community.json";
import eventsJson from "@/data/events.json";
import helpDeskTicketsJson from "@/data/help-desk-tickets.json";
import helpDeskVendorsJson from "@/data/help-desk-vendors.json";
import feedPostsJson from "@/data/feed-posts.json";
import homeExtrasJson from "@/data/home-extras.json";
import marketplaceJson from "@/data/marketplace.json";
import rentDashboardJson from "@/data/rent-dashboard.json";
import residentJson from "@/data/resident.json";
import { materializeEvents, type RawEvent } from "@/lib/events/normalize";
import { isPublishedUpcoming } from "@/lib/events/query";
import type { CommunityCatalog } from "@/lib/types/community";
import type { HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import type { RentDashboard } from "@/lib/types/rent";
import type { MarketplaceListing } from "@/lib/types/marketplace";
import type {
  Amenity,
  Digest,
  DigestItem,
  FeedPost,
  HomeData,
  HomeEvent,
  Resident,
} from "@/lib/types/home";

const HOME_DIGEST_NOTICE_LIMIT = 3;
const HOME_DIGEST_POST_LIMIT = 2;

function buildDigest(): Digest {
  const base = homeExtrasJson.digest as Digest;
  const allPosts = feedPostsJson as FeedPost[];
  return {
    ...base,
    items: base.items.slice(0, HOME_DIGEST_NOTICE_LIMIT),
    posts: allPosts.slice(0, HOME_DIGEST_POST_LIMIT),
    totalCount: base.totalCount,
    totalPostCount: allPosts.length,
  };
}

const events = materializeEvents(eventsJson as RawEvent[]);

export function getStaticResident(): Resident {
  return residentJson as Resident;
}

export function getStaticEvents(): HomeEvent[] {
  return events;
}

export function getStaticEventById(id: string): HomeEvent | undefined {
  return events.find((event) => event.id === id);
}

export function getStaticAmenities(): Amenity[] {
  return STATIC_AMENITY_DETAILS;
}

export function getStaticAmenityById(id: string): AmenityDetail | undefined {
  return STATIC_AMENITY_DETAILS.find((amenity) => amenity.id === id);
}

export function getStaticAnnouncements(): DigestItem[] {
  return announcementsJson as DigestItem[];
}

export function getStaticHomeData(options?: { empty?: boolean }): HomeData {
  const extras = homeExtrasJson as Pick<HomeData, "digest" | "match" | "prompt">;
  if (options?.empty) {
    return {
      resident: getStaticResident(),
      digest: null,
      events: [],
      amenities: [],
      match: null,
      prompt: extras.prompt,
    };
  }
  return {
    resident: getStaticResident(),
    digest: buildDigest(),
    events: getStaticEvents().filter((event) => isPublishedUpcoming(event)),
    amenities: getStaticAmenities(),
    match: extras.match,
    prompt: extras.prompt,
  };
}

export function getStaticCommunity(): CommunityCatalog {
  return communityJson as CommunityCatalog;
}

export function getStaticFeedPosts(): FeedPost[] {
  return feedPostsJson as FeedPost[];
}

export function getStaticMarketplaceListings(): MarketplaceListing[] {
  return marketplaceJson as MarketplaceListing[];
}

export function getStaticMarketplaceListingById(id: string): MarketplaceListing | undefined {
  return getStaticMarketplaceListings().find((item) => item.id === id);
}

export function getStaticHelpDeskVendors(): HelpDeskVendor[] {
  return helpDeskVendorsJson as HelpDeskVendor[];
}

export function getStaticHelpDeskTickets(): HelpDeskTicket[] {
  return helpDeskTicketsJson as HelpDeskTicket[];
}

export function getStaticRentDashboard(): RentDashboard {
  return rentDashboardJson as RentDashboard;
}
