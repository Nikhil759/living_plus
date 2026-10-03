import type Database from "better-sqlite3";
import amenitiesJson from "@/data/amenities.json";
import announcementsJson from "@/data/announcements.json";
import communityJson from "@/data/community.json";
import eventsJson from "@/data/events.json";
import flatOpeningsJson from "@/data/flat-openings.json";
import helpDeskTicketsJson from "@/data/help-desk-tickets.json";
import helpDeskVendorsJson from "@/data/help-desk-vendors.json";
import feedPostsJson from "@/data/feed-posts.json";
import homeExtrasJson from "@/data/home-extras.json";
import localBusinessesJson from "@/data/local-businesses.json";
import marketplaceJson from "@/data/marketplace.json";
import rentDashboardJson from "@/data/rent-dashboard.json";
import residentJson from "@/data/resident.json";
import { DEFAULT_RESIDENT_USER_ID } from "@/lib/demo-store/config";
import { materializeEvents, type RawEvent } from "@/lib/events/normalize";
import type { FeedPost, Resident } from "@/lib/types/home";

function upsertBlob(db: Database.Database, key: string, payload: unknown): void {
  db.prepare(
    "INSERT INTO demo_blob (key, payload) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload",
  ).run(key, JSON.stringify(payload));
}

function upsertEntity(db: Database.Database, collection: string, id: string, payload: unknown): void {
  db.prepare(
    `INSERT INTO demo_entity (collection, id, payload) VALUES (?, ?, ?)
     ON CONFLICT(collection, id) DO UPDATE SET payload = excluded.payload`,
  ).run(collection, id, JSON.stringify(payload));
}

function upsertResident(db: Database.Database, userId: string, resident: Resident): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO demo_resident (user_id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  ).run(userId, JSON.stringify(resident), now);
}

export function seedDemoDatabaseFromStatic(db: Database.Database): void {
  const events = materializeEvents(eventsJson as RawEvent[]);
  for (const event of events) {
    upsertEntity(db, "events", event.id, event);
  }

  for (const amenity of amenitiesJson) {
    upsertEntity(db, "amenities", amenity.id, amenity);
  }

  for (const item of announcementsJson) {
    upsertEntity(db, "announcements", item.id, item);
  }

  for (const post of feedPostsJson as FeedPost[]) {
    upsertEntity(db, "feed_posts", post.id, post);
  }

  for (const listing of marketplaceJson) {
    upsertEntity(db, "marketplace", listing.id, listing);
  }

  for (const business of localBusinessesJson) {
    upsertEntity(db, "local_businesses", business.id, business);
  }

  for (const opening of flatOpeningsJson) {
    upsertEntity(db, "flat_openings", opening.id, opening);
  }

  for (const vendor of helpDeskVendorsJson) {
    upsertEntity(db, "help_desk_vendors", vendor.id, vendor);
  }

  for (const ticket of helpDeskTicketsJson) {
    upsertEntity(db, "help_desk_tickets", ticket.id, ticket);
  }

  upsertBlob(db, "home_extras", homeExtrasJson);
  upsertBlob(db, "community", communityJson);
  upsertBlob(db, "rent_dashboard", rentDashboardJson);

  upsertResident(db, DEFAULT_RESIDENT_USER_ID, residentJson as Resident);
}
