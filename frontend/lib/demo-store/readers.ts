import type Database from "better-sqlite3";
import { DEFAULT_RESIDENT_USER_ID } from "@/lib/demo-store/config";
import { getDemoDb } from "@/lib/demo-store/db";
import type { CommunityCatalog } from "@/lib/types/community";
import type { HelpDeskIssue, HelpDeskTicket, HelpDeskVendor } from "@/lib/types/help-desk";
import { issueToListRow } from "@/lib/help-desk/format";
import type { RentDashboard } from "@/lib/types/rent";
import type { MarketplaceListing } from "@/lib/types/marketplace";
import { isPublishedUpcoming } from "@/lib/events/query";
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

function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function getBlob<T>(db: Database.Database, key: string): T {
  const row = db.prepare("SELECT payload FROM demo_blob WHERE key = ?").get(key) as
    | { payload: string }
    | undefined;
  if (!row) {
    throw new Error(`Missing demo blob: ${key}`);
  }
  return parseJson<T>(row.payload);
}

function listEntities<T>(db: Database.Database, collection: string): T[] {
  const rows = db
    .prepare("SELECT payload FROM demo_entity WHERE collection = ? ORDER BY id")
    .all(collection) as { payload: string }[];
  return rows.map((row) => parseJson<T>(row.payload));
}

function getEntity<T>(db: Database.Database, collection: string, id: string): T | undefined {
  const row = db
    .prepare("SELECT payload FROM demo_entity WHERE collection = ? AND id = ?")
    .get(collection, id) as { payload: string } | undefined;
  return row ? parseJson<T>(row.payload) : undefined;
}

function buildDigest(db: Database.Database): Digest {
  const extras = getBlob<{ digest: Digest }>(db, "home_extras");
  const base = extras.digest;
  const allPosts = listEntities<FeedPost>(db, "feed_posts");
  return {
    ...base,
    items: base.items.slice(0, HOME_DIGEST_NOTICE_LIMIT),
    posts: allPosts.slice(0, HOME_DIGEST_POST_LIMIT),
    totalCount: base.totalCount,
    totalPostCount: allPosts.length,
  };
}

export function demoGetResidentRow(db: Database.Database, userId: string): Resident | undefined {
  const row = db.prepare("SELECT payload FROM demo_resident WHERE user_id = ?").get(userId) as
    | { payload: string }
    | undefined;
  return row ? parseJson<Resident>(row.payload) : undefined;
}

export function demoGetDefaultResident(): Resident {
  const db = getDemoDb();
  const resident = demoGetResidentRow(db, DEFAULT_RESIDENT_USER_ID);
  if (!resident) {
    throw new Error("Default resident missing from demo store.");
  }
  return resident;
}

export function demoGetResidentForUser(userId: string | null): Resident {
  const db = getDemoDb();
  const base = demoGetResidentRow(db, DEFAULT_RESIDENT_USER_ID) ?? demoGetDefaultResident();
  if (!userId) return base;
  const overlay = demoGetResidentRow(db, userId);
  if (!overlay) return { ...base, id: userId };
  return { ...base, ...overlay, id: userId };
}

export function demoGetHomeData(options?: { empty?: boolean }): HomeData {
  const db = getDemoDb();
  const extras = getBlob<Pick<HomeData, "match" | "prompt">>(db, "home_extras");
  if (options?.empty) {
    return {
      resident: demoGetDefaultResident(),
      digest: null,
      events: [],
      amenities: [],
      match: null,
      prompt: extras.prompt,
    };
  }
  return {
    resident: demoGetDefaultResident(),
    digest: buildDigest(db),
    events: listEntities<HomeEvent>(db, "events").filter((event) => isPublishedUpcoming(event)),
    amenities: listEntities<Amenity>(db, "amenities"),
    match: extras.match ?? null,
    prompt: extras.prompt,
  };
}

export function demoGetEvents(): HomeEvent[] {
  return listEntities<HomeEvent>(getDemoDb(), "events");
}

export function demoGetEventById(id: string): HomeEvent | undefined {
  return getEntity<HomeEvent>(getDemoDb(), "events", id);
}

export function demoGetAmenities(): Amenity[] {
  return listEntities<Amenity>(getDemoDb(), "amenities");
}

export function demoGetAnnouncements(): DigestItem[] {
  return listEntities<DigestItem>(getDemoDb(), "announcements");
}

export function demoGetCommunity(): CommunityCatalog {
  return getBlob<CommunityCatalog>(getDemoDb(), "community");
}

export function demoGetFeedPosts(): FeedPost[] {
  return listEntities<FeedPost>(getDemoDb(), "feed_posts");
}

export function demoGetMarketplaceListings(): MarketplaceListing[] {
  return listEntities<MarketplaceListing>(getDemoDb(), "marketplace");
}

export function demoGetMarketplaceListingById(id: string): MarketplaceListing | undefined {
  return getEntity<MarketplaceListing>(getDemoDb(), "marketplace", id);
}

export function demoGetHelpDeskVendors(): HelpDeskVendor[] {
  return listEntities<HelpDeskVendor>(getDemoDb(), "help_desk_vendors");
}

export function demoGetHelpDeskIssues(): HelpDeskIssue[] {
  return listEntities<HelpDeskIssue>(getDemoDb(), "help_desk_issues");
}

export function demoGetHelpDeskIssueById(id: string): HelpDeskIssue | undefined {
  return getEntity<HelpDeskIssue>(getDemoDb(), "help_desk_issues", id);
}

export function demoGetHelpDeskTickets(): HelpDeskTicket[] {
  return demoGetHelpDeskIssues().map((issue) => issueToListRow(issue));
}

export function demoGetRentDashboard(): RentDashboard {
  return getBlob<RentDashboard>(getDemoDb(), "rent_dashboard");
}
