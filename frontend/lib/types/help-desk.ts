export type VendorCategory =
  | "housekeeping"
  | "electrical"
  | "plumbing"
  | "carpentry"
  | "pest_control"
  | "appliance"
  | "other";

export interface HelpDeskVendor {
  id: string;
  name: string;
  category: VendorCategory;
  emoji: string;
  phone?: string;
  whatsapp?: string;
  note?: string;
  hoursLabel?: string;
  societyApproved: boolean;
}

export type HelpDeskIssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type HelpDeskCategory =
  | "lift"
  | "water"
  | "electricity"
  | "plumbing"
  | "security"
  | "cleanliness"
  | "parking"
  | "amenity"
  | "noise"
  | "other";

export type HelpDeskIssueScope = "my_flat" | "common_area";

export type HelpDeskUrgency = "normal" | "urgent";

export type HelpDeskTimelineKind =
  | "created"
  | "status"
  | "vendor"
  | "committee_note"
  | "comment"
  | "photo";

export interface HelpDeskTimelineEntry {
  id: string;
  kind: HelpDeskTimelineKind;
  at: string;
  actorName: string;
  actorRole?: "resident" | "committee";
  message: string;
}

export interface HelpDeskIssue {
  id: string;
  number: string;
  title: string;
  description: string;
  category: HelpDeskCategory;
  scope: HelpDeskIssueScope;
  tower: string;
  areaLabel?: string;
  urgency: HelpDeskUrgency;
  status: HelpDeskIssueStatus;
  createdAt: string;
  reporterIds: string[];
  reporterEmails: string[];
  followerIds: string[];
  photoUrls: string[];
  assignedVendorId?: string;
  timeline: HelpDeskTimelineEntry[];
  /** Resolved but resident has not confirmed fix yet. */
  awaitingConfirmation?: boolean;
  confirmationDueAt?: string;
}

/** @deprecated list alias */
export type HelpDeskTicketStatus = HelpDeskIssueStatus;

/** @deprecated list alias */
export type HelpDeskTicketCategory = HelpDeskCategory;

export interface HelpDeskTicket {
  id: string;
  title: string;
  category: HelpDeskCategory;
  status: HelpDeskIssueStatus;
  createdAt: string;
  lastUpdate: string;
  number: string;
  urgency: HelpDeskUrgency;
}

export type FeedbackTopic = "committee" | "app" | "suggestion";

export interface HelpDeskFeedback {
  id: string;
  topic: FeedbackTopic;
  message: string;
  anonymous: boolean;
  authorName?: string;
  authorEmail?: string;
  createdAt: string;
  read: boolean;
}
