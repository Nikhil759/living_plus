/** Domain types for the Home screen. Kept UI-framework agnostic (no React types). */

export interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
  /** When false, neighbours do not see this attendee’s avatar or first name. */
  isVisible?: boolean;
}

export type EventAudience = "society" | "towers" | "group";

export interface EventAttendee extends Person {
  fullName?: string;
  tower?: string;
  guestCount?: number;
  checkedIn?: boolean;
}

export interface EventHostProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  tower?: string;
  eventsHosted: number;
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

export type EventType = "free" | "paid" | "society";

export type EventRecurrence = "none" | "weekly" | "biweekly" | "monthly";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "cancelled"
  | "completed";

export type EventCategory =
  | "sports"
  | "fitness"
  | "kids"
  | "food"
  | "music"
  | "learning"
  | "social"
  | "other";

export type EventListTab = "upcoming" | "going" | "hosting" | "past";

export type StallApplicationStatus = "pending" | "approved" | "rejected" | "paid";

export interface StallCategory {
  name: string;
  limit?: number | null;
}

export interface StallApplication {
  id: string;
  stallType: string;
  description?: string | null;
  feeInr: number;
  spotNo?: string | null;
  status: StallApplicationStatus;
  applicantId: string;
  applicantName: string;
}

export interface HomeEvent {
  id: string;
  title: string;
  host: string;
  hostName?: string;
  hostUserId?: string;
  hostIcon: EventHostIcon;
  /** ISO-8601 timestamp. Formatted for display by `formatEventWhen`. */
  startsAt: string;
  endsAt?: string;
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
  eventType?: EventType;
  status?: EventStatus;
  category?: EventCategory;
  capacity?: number;
  tags?: string[];
  description?: string;
  viewerGoing?: boolean;
  viewerGuestCount?: number;
  viewerWaitlisted?: boolean;
  waitlistCount?: number;
  isHost?: boolean;
  isCommittee?: boolean;
  whatToBring?: string;
  guestLimit?: number;
  audience?: EventAudience;
  recurrence?: EventRecurrence;
  recurrenceLabel?: string;
  seriesId?: string;
  amenityId?: string;
  changeSummary?: string;
  cancelReason?: string;
  rejectionReason?: string;
  stallsEnabled?: boolean;
  stallCount?: number | null;
  stallFeeInr?: number;
  stallCategories?: StallCategory[];
  stallApplicationDeadline?: string | null;
  viewerStall?: StallApplication | null;
  stallApplications?: StallApplication[] | null;
  hostProfile?: EventHostProfile;
  /** Host and committee only. Neighbours get `null`. */
  attendees?: EventAttendee[] | null;
}

export type AmenityStatus = "free" | "open" | "quiet" | "moderate" | "booked" | "closed";
export type AmenityKind = "bookable" | "walk_in" | "space";
export type AmenityCategory = "sports" | "fitness" | "spaces" | "other";

export interface Amenity {
  id: string;
  name: string;
  emoji: string;
  status: AmenityStatus;
  /** Short human text, e.g. "Next free: 6–7 PM". */
  detail: string;
  /** The fields below come from the API; older mock data omits them. */
  kind?: AmenityKind;
  category?: AmenityCategory;
  imageUrl?: string | null;
  /** Live label: Quiet, Moderate, Busy or Closed. */
  statusLabel?: string;
  action?: "book" | "view" | "host";
  actionLabel?: string;
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
