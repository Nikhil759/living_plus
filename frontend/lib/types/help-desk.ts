export type VendorCategory =
  | "housekeeping"
  | "electrical"
  | "plumbing"
  | "lift"
  | "security"
  | "carpentry"
  | "pest_control"
  | "other";

export interface HelpDeskVendor {
  id: string;
  name: string;
  category: VendorCategory;
  emoji: string;
  phone?: string;
  whatsapp?: string;
  note?: string;
  /** Society management approved vendor list */
  societyApproved: boolean;
}

export type HelpDeskTicketStatus = "open" | "in_progress" | "resolved";

export type HelpDeskTicketCategory =
  | "maintenance"
  | "lift"
  | "water"
  | "security"
  | "amenity"
  | "noise"
  | "other";

export interface HelpDeskTicket {
  id: string;
  title: string;
  category: HelpDeskTicketCategory;
  status: HelpDeskTicketStatus;
  createdAt: string;
  lastUpdate: string;
}
