import { ApiError } from "@/lib/api/client";
import { apiGetAsUser, getServerAccessToken } from "@/lib/api/server-auth";
import { fetchAnnouncements, fetchAmenities } from "@/lib/api/amenities";
import { fetchHomeData } from "@/lib/api/home";
import { useDemoStore } from "@/lib/demo-store/config";
import {
  demoGetAmenities,
  demoGetAnnouncements,
  demoGetCommunity,
  demoGetEventById,
  demoGetEvents,
  demoGetFeedPosts,
  demoGetFlatOpeningById,
  demoGetFlatOpenings,
  demoGetHelpDeskTickets,
  demoGetHelpDeskVendors,
  demoGetHomeData,
  demoGetLocalBusinessById,
  demoGetLocalBusinesses,
  demoGetMarketplaceListingById,
  demoGetMarketplaceListings,
  demoGetRentDashboard,
} from "@/lib/demo-store/readers";
import { demoListUserRsvpEventIds } from "@/lib/demo-store/events-write";
import { demoHomeResidentForUser, mergeSessionIntoResident } from "@/lib/demo-store/resident-write";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import {
  annotateEvents,
  eventViewerFromResident,
  filterEvents,
  type EventListQuery,
} from "@/lib/events/query";
import { getDataSource } from "@/lib/data/source";
import { loadResident } from "@/lib/data/load-resident";
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
} from "@/lib/types/home";

export { getDataSource, loadResident };

async function withDemoHomeResident(data: HomeData): Promise<HomeData> {
  const session = await getDemoSessionUser();
  const resident = session
    ? mergeSessionIntoResident(demoHomeResidentForUser(session.id), session)
    : demoHomeResidentForUser(null);
  return { ...data, resident };
}

export async function loadHomeData(options?: { empty?: boolean }): Promise<HomeData> {
  if (useDemoStore()) {
    return withDemoHomeResident(demoGetHomeData(options));
  }
  const token = await getServerAccessToken();
  if (getDataSource() === "api") {
    if (!token) {
      throw new ApiError("Sign in required.", 401, "unauthorised");
    }
    return fetchHomeData();
  }
  return staticData.getStaticHomeData(options);
}

export async function loadEvents(): Promise<HomeEvent[]> {
  if (useDemoStore()) return demoGetEvents();
  if (getDataSource() === "api") return apiGetAsUser<HomeEvent[]>("/v1/events");
  return staticData.getStaticEvents();
}

export async function loadEventList(query: EventListQuery = {}): Promise<HomeEvent[]> {
  const [events, resident] = await Promise.all([loadEvents(), loadResident()]);
  let rsvpIds: string[] = [];
  if (useDemoStore()) {
    const session = await getDemoSessionUser();
    rsvpIds = session ? demoListUserRsvpEventIds(session.id) : demoListUserRsvpEventIds(resident.id);
  }
  const viewer = eventViewerFromResident(resident, rsvpIds);
  return filterEvents(annotateEvents(events, viewer), query);
}

export async function loadEventById(id: string): Promise<HomeEvent | undefined> {
  if (useDemoStore()) return demoGetEventById(id);
  if (getDataSource() === "api") {
    try {
      return await apiGetAsUser<HomeEvent>(`/v1/events/${encodeURIComponent(id)}`);
    } catch {
      return undefined;
    }
  }
  return staticData.getStaticEventById(id);
}

export async function loadAmenities(): Promise<Amenity[]> {
  if (useDemoStore()) return demoGetAmenities();
  if (getDataSource() === "api") return fetchAmenities();
  return staticData.getStaticAmenities();
}

export async function loadAnnouncements(): Promise<DigestItem[]> {
  if (useDemoStore()) return demoGetAnnouncements();
  if (getDataSource() === "api") return fetchAnnouncements();
  return staticData.getStaticAnnouncements();
}

export async function loadCommunity(): Promise<CommunityCatalog> {
  if (useDemoStore()) return demoGetCommunity();
  return staticData.getStaticCommunity();
}

export async function loadMarketplaceListings(): Promise<MarketplaceListing[]> {
  if (useDemoStore()) return demoGetMarketplaceListings();
  return staticData.getStaticMarketplaceListings();
}

export async function loadMarketplaceListingById(
  id: string,
): Promise<MarketplaceListing | undefined> {
  if (useDemoStore()) return demoGetMarketplaceListingById(id);
  return staticData.getStaticMarketplaceListingById(id);
}

export async function loadLocalBusinesses(): Promise<LocalBusiness[]> {
  if (useDemoStore()) return demoGetLocalBusinesses();
  return staticData.getStaticLocalBusinesses();
}

export async function loadLocalBusinessById(id: string): Promise<LocalBusiness | undefined> {
  if (useDemoStore()) return demoGetLocalBusinessById(id);
  return staticData.getStaticLocalBusinessById(id);
}

export async function loadFeedPosts(): Promise<FeedPost[]> {
  if (useDemoStore()) return demoGetFeedPosts();
  return staticData.getStaticFeedPosts();
}

export async function loadFlatOpenings(): Promise<FlatOpening[]> {
  if (useDemoStore()) return demoGetFlatOpenings();
  return staticData.getStaticFlatOpenings();
}

export async function loadFlatOpeningById(id: string): Promise<FlatOpening | undefined> {
  if (useDemoStore()) return demoGetFlatOpeningById(id);
  return staticData.getStaticFlatOpeningById(id);
}

export async function loadHelpDeskVendors(): Promise<HelpDeskVendor[]> {
  if (useDemoStore()) return demoGetHelpDeskVendors();
  return staticData.getStaticHelpDeskVendors();
}

export async function loadHelpDeskTickets(): Promise<HelpDeskTicket[]> {
  if (useDemoStore()) return demoGetHelpDeskTickets();
  return staticData.getStaticHelpDeskTickets();
}

export async function loadRentDashboard(): Promise<RentDashboard> {
  if (useDemoStore()) return demoGetRentDashboard();
  return staticData.getStaticRentDashboard();
}

/** Profile edits: demo SQLite vs FastAPI. */
export function profileEditBackend(): "demo" | "api" {
  if (useDemoStore()) return "demo";
  return "api";
}

/** Event create / RSVP: demo SQLite vs FastAPI. */
export function eventsWriteBackend(): "demo" | "api" {
  if (useDemoStore()) return "demo";
  return "api";
}
