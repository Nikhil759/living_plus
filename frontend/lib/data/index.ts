import { ApiError } from "@/lib/api/client";
import { apiGetAsUser, getServerAccessToken } from "@/lib/api/server-auth";
import { fetchAmenity, fetchAnnouncements, fetchAmenities, fetchMyBookings } from "@/lib/api/amenities";
import { fetchHomeData } from "@/lib/api/home";
import { useDemoStore } from "@/lib/demo-store/config";
import {
  demoGetAmenities,
  demoGetAnnouncements,
  demoGetCommunity,
  demoGetEventById,
  demoGetEvents,
  demoGetFeedPosts,
  demoGetHelpDeskTickets,
  demoGetHelpDeskVendors,
  demoGetHomeData,
  demoGetMarketplaceListingById,
  demoGetMarketplaceListings,
  demoGetRentDashboard,
} from "@/lib/demo-store/readers";
import { demoListUserRsvpEventIds } from "@/lib/demo-store/events-write";
import { demoHomeResidentForUser, mergeSessionIntoResident } from "@/lib/demo-store/resident-write";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import type { AmenityBooking, AmenityDetail } from "@/lib/types/amenities";
import { attachHostProfile } from "@/lib/events/detail";
import {
  annotateEvent,
  annotateEvents,
  canViewEvent,
  eventViewerFromResident,
  filterEvents,
  type EventListQuery,
} from "@/lib/events/query";
import { resolveAmenityImageSrc } from "@/lib/amenities/image-url";
import { getDataSource } from "@/lib/data/source";
import { loadResident } from "@/lib/data/load-resident";
import * as staticData from "@/lib/data/static";
import type { CommunityCatalog } from "@/lib/types/community";
import type { BusinessCard, BusinessDetail } from "@/lib/types/local-business";
import type { FlatOpeningCard, FlatOpeningDetail } from "@/lib/types/flat-opening";
import type { HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import type { RentDashboard } from "@/lib/types/rent";
import type { MarketplaceCard, MarketplaceListing } from "@/lib/types/marketplace";
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

async function eventViewerRsvpIds(residentId: string): Promise<string[]> {
  if (!useDemoStore()) return [];
  const session = await getDemoSessionUser();
  return session ? demoListUserRsvpEventIds(session.id) : demoListUserRsvpEventIds(residentId);
}

export async function loadEventById(id: string): Promise<HomeEvent | undefined> {
  let raw: HomeEvent | undefined;
  if (useDemoStore()) raw = demoGetEventById(id);
  else if (getDataSource() === "api") {
    try {
      raw = await apiGetAsUser<HomeEvent>(`/v1/events/${encodeURIComponent(id)}`);
    } catch {
      return undefined;
    }
  } else {
    raw = staticData.getStaticEventById(id);
  }
  if (!raw) return undefined;

  const [catalog, resident] = await Promise.all([loadEvents(), loadResident()]);
  const viewer = eventViewerFromResident(resident, await eventViewerRsvpIds(resident.id));
  const annotated = annotateEvent(raw, viewer);
  if (!canViewEvent(annotated)) return undefined;
  return attachHostProfile(annotated, catalog, resident);
}

function withAmenityImages<T extends Amenity>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    imageUrl: resolveAmenityImageSrc(row),
  }));
}

export async function loadAmenities(): Promise<Amenity[]> {
  if (useDemoStore()) return demoGetAmenities();
  if (getDataSource() === "api") {
    try {
      return withAmenityImages(await fetchAmenities());
    } catch {
      return staticData.getStaticAmenities();
    }
  }
  return staticData.getStaticAmenities();
}

export async function loadAmenityById(id: string): Promise<AmenityDetail | undefined> {
  if (useDemoStore()) {
    const row = demoGetAmenities().find((amenity) => amenity.id === id);
    return row ? ({ ...row, capacity: 0, hoursLabel: "", rules: [], advanceDays: 0, maxHoursPerDay: 0, canManage: false } as AmenityDetail) : undefined;
  }
  if (getDataSource() === "api") {
    try {
      const fromApi = await fetchAmenity(id);
      if (fromApi) {
        return { ...fromApi, imageUrl: resolveAmenityImageSrc(fromApi) };
      }
    } catch {
      /* fall through to bundled catalog */
    }
    return staticData.getStaticAmenityById(id);
  }
  return staticData.getStaticAmenityById(id);
}

/** Upcoming bookings exist only when the API is the data source. */
export async function loadMyBookings(): Promise<AmenityBooking[]> {
  if (useDemoStore() || getDataSource() !== "api") return [];
  return fetchMyBookings();
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

/** Browse, create and edit need the FastAPI backend; the other sources only feed read-only previews. */
export function marketplaceIsLive(): boolean {
  return !useDemoStore() && getDataSource() === "api";
}

export async function loadMarketplaceListings(): Promise<MarketplaceCard[]> {
  if (useDemoStore()) return demoGetMarketplaceListings();
  if (marketplaceIsLive()) return apiGetAsUser<MarketplaceCard[]>("/v1/marketplace/listings");
  return staticData.getStaticMarketplaceListings();
}

export async function loadMarketplaceListingById(
  id: string,
): Promise<MarketplaceListing | undefined> {
  if (useDemoStore()) return demoGetMarketplaceListingById(id);
  if (!marketplaceIsLive()) return staticData.getStaticMarketplaceListingById(id);
  try {
    return await apiGetAsUser<MarketplaceListing>(`/v1/marketplace/listings/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return undefined;
    throw error;
  }
}

/** Local businesses only exist in the live backend; elsewhere Home just shows its empty state. */
export async function loadLocalBusinesses(): Promise<BusinessCard[]> {
  if (!marketplaceIsLive()) return [];
  return apiGetAsUser<BusinessCard[]>("/v1/local-businesses");
}

export async function loadLocalBusinessById(id: string): Promise<BusinessDetail | undefined> {
  if (!marketplaceIsLive()) return undefined;
  try {
    return await apiGetAsUser<BusinessDetail>(`/v1/local-businesses/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return undefined;
    throw error;
  }
}

export async function loadFeedPosts(): Promise<FeedPost[]> {
  if (useDemoStore()) return demoGetFeedPosts();
  return staticData.getStaticFeedPosts();
}

/** Flat openings only exist in the live backend; elsewhere Home just shows its empty state. */
export async function loadFlatOpenings(): Promise<FlatOpeningCard[]> {
  if (!marketplaceIsLive()) return [];
  return apiGetAsUser<FlatOpeningCard[]>("/v1/flat-openings");
}

export async function loadFlatOpeningById(id: string): Promise<FlatOpeningDetail | undefined> {
  if (!marketplaceIsLive()) return undefined;
  try {
    return await apiGetAsUser<FlatOpeningDetail>(`/v1/flat-openings/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return undefined;
    throw error;
  }
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
