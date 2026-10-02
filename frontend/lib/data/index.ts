import { fetchAnnouncements, fetchAmenities } from "@/lib/api/amenities";
import { fetchEventBySlug, fetchEvents } from "@/lib/api/events";
import { fetchCurrentResident, fetchHomeData } from "@/lib/api/home";
import { getDataSource } from "@/lib/data/source";
import * as staticData from "@/lib/data/static";
import type { CommunityCatalog } from "@/lib/types/community";
import type { LocalBusiness } from "@/lib/types/local-business";
import type { FlatOpening } from "@/lib/types/flat-opening";
import type { HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import type { RentDashboard } from "@/lib/types/rent";
import type { MarketplaceListing } from "@/lib/types/marketplace";
import type {
  DigestItem,
  FeedPost,
  HomeData,
  HomeEvent,
  Amenity,
  Resident,
} from "@/lib/types/home";

export { getDataSource };

export async function loadResident(): Promise<Resident> {
  if (getDataSource() === "api") {
    return fetchCurrentResident();
  }
  return staticData.getStaticResident();
}

export async function loadHomeData(options?: { empty?: boolean }): Promise<HomeData> {
  if (getDataSource() === "api") {
    return fetchHomeData();
  }
  return staticData.getStaticHomeData(options);
}

export async function loadEvents(): Promise<HomeEvent[]> {
  if (getDataSource() === "api") {
    return fetchEvents();
  }
  return staticData.getStaticEvents();
}

export async function loadEventById(id: string): Promise<HomeEvent | undefined> {
  if (getDataSource() === "api") {
    try {
      return await fetchEventBySlug(id);
    } catch {
      return undefined;
    }
  }
  return staticData.getStaticEventById(id);
}

export async function loadAmenities(): Promise<Amenity[]> {
  if (getDataSource() === "api") {
    return fetchAmenities();
  }
  return staticData.getStaticAmenities();
}

export async function loadAnnouncements(): Promise<DigestItem[]> {
  if (getDataSource() === "api") {
    return fetchAnnouncements();
  }
  return staticData.getStaticAnnouncements();
}

export async function loadCommunity(): Promise<CommunityCatalog> {
  return staticData.getStaticCommunity();
}

export async function loadMarketplaceListings(): Promise<MarketplaceListing[]> {
  return staticData.getStaticMarketplaceListings();
}

export async function loadMarketplaceListingById(
  id: string,
): Promise<MarketplaceListing | undefined> {
  return staticData.getStaticMarketplaceListingById(id);
}

export async function loadLocalBusinesses(): Promise<LocalBusiness[]> {
  return staticData.getStaticLocalBusinesses();
}

export async function loadLocalBusinessById(id: string): Promise<LocalBusiness | undefined> {
  return staticData.getStaticLocalBusinessById(id);
}

export async function loadFeedPosts(): Promise<FeedPost[]> {
  return staticData.getStaticFeedPosts();
}

export async function loadFlatOpenings(): Promise<FlatOpening[]> {
  return staticData.getStaticFlatOpenings();
}

export async function loadFlatOpeningById(id: string): Promise<FlatOpening | undefined> {
  return staticData.getStaticFlatOpeningById(id);
}

export async function loadHelpDeskVendors(): Promise<HelpDeskVendor[]> {
  return staticData.getStaticHelpDeskVendors();
}

export async function loadHelpDeskTickets(): Promise<HelpDeskTicket[]> {
  return staticData.getStaticHelpDeskTickets();
}

export async function loadRentDashboard(): Promise<RentDashboard> {
  return staticData.getStaticRentDashboard();
}
