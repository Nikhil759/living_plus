/** Domain types for the Home screen. Kept UI-framework agnostic (no React types). */

export interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Resident extends Person {
  society: string;
  tower: string;
  flat: string;
  roles: string[];
  hasUnreadNotifications: boolean;
  bio?: string | null;
  interests?: string[];
  isVisible?: boolean;
  showFlat?: boolean;
}

export interface ProfilePatch {
  bio?: string | null;
  interests?: string[];
  isVisible?: boolean;
  showFlat?: boolean;
}

/** Glyph shown in the image area when an event has no photo. */
export type EventGlyph = "ride" | "game" | "music" | "wellness" | "general";

/** Small icon shown next to the host line. */
export type EventHostIcon = "person" | "celebration" | "club";

export interface HomeEvent {
  id: string;
  title: string;
  host: string;
  hostIcon: EventHostIcon;
  /** ISO-8601 timestamp. Formatted for display by `formatEventWhen`. */
  startsAt: string;
  location: string;
  /** Price in INR. `0` renders as "Free". */
  priceInr: number;
  imageUrl?: string;
  imageAlt?: string;
  glyph: EventGlyph;
  goingCount: number;
  going?: Person[];
  actionLabel: string;
  actionTone: "solid" | "soft";
  href: string;
}

export type AmenityStatus = "free" | "open" | "quiet" | "moderate" | "booked";

export interface Amenity {
  id: string;
  name: string;
  emoji: string;
  status: AmenityStatus;
  /** Short human text, e.g. "Moderate · 6 active". */
  detail: string;
}

export interface DigestItem {
  id: string;
  emoji: string;
  /** Bold lead-in, e.g. "Water maintenance:" */
  lead: string;
  body: string;
}

/** Resident or group post shown in the society feed. */
export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatarUrl?: string;
  /** e.g. "Tower B · 404" */
  authorMeta: string;
  /** When set, post is surfaced in a group context. */
  groupName?: string;
  body: string;
  /** ISO-8601 */
  postedAt: string;
  commentCount: number;
  reactionCount: number;
  imageUrl?: string;
  imageAlt?: string;
}

export interface Digest {
  title: string;
  subtitle: string;
  /** Short AI paragraph for the Today card. */
  summary?: string;
  items: DigestItem[];
  /** Total announcements available (may exceed `items.length`). */
  totalCount: number;
  /** Recent neighbour posts (social feed). */
  posts?: FeedPost[];
  /** Total posts in feed (may exceed `posts.length`). */
  totalPostCount?: number;
}

export interface NeighbourMatch {
  label: string;
  title: string;
  description: string;
  people: Person[];
  /** Total matched neighbours (may exceed `people.length`). */
  totalCount: number;
  activeSummary: string;
  actionLabel: string;
}

export interface AanganPrompt {
  suggestion: string;
}

export interface HomeData {
  resident: Resident;
  digest: Digest | null;
  events: HomeEvent[];
  amenities: Amenity[];
  match: NeighbourMatch | null;
  prompt: AanganPrompt;
}
