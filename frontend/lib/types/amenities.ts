import type { Amenity } from "@/lib/types/home";

export interface AmenityBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  startsAt: string;
  endsAt: string;
}

export type SlotState = "free" | "booked" | "yours" | "blocked" | "past";

export interface AmenitySlot {
  startsAt: string;
  endsAt: string;
  state: SlotState;
  /** Why a slot is blocked, e.g. "Kids coaching". */
  label?: string | null;
  bookingId?: string | null;
}

export interface AmenitySlots {
  date: string;
  slots: AmenitySlot[];
}

export type CrowdLevel = "quiet" | "moderate" | "busy";

export interface CrowdHour {
  hour: number;
  level: CrowdLevel;
}

export interface AmenityCrowd {
  date: string;
  hours: CrowdHour[];
  currentHour?: number | null;
  /** e.g. "Usually quiet now". */
  summary: string;
}

export interface AmenityDetail extends Amenity {
  capacity: number;
  hoursLabel: string;
  rules: string[];
  closureNote?: string | null;
  advanceDays: number;
  maxHoursPerDay: number;
  canManage: boolean;
}
