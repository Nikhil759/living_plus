import { formatInr, generateTitle, PREFERENCES_FOR } from "@/lib/openings/view";
import type {
  FlatOpeningCard,
  FlatOpeningDetail,
  Furnishing,
  OpeningContactMethod,
  OpeningIncluded,
  OpeningKind,
  OpeningOptions,
  OpeningPreference,
} from "@/lib/types/flat-opening";

export const MAX_DESCRIPTION = 400;
export const MIN_RENT = 1_000;
export const MAX_RENT = 500_000;
export const MAX_DEPOSIT = 5_000_000;
export const MAX_MAINTENANCE = 100_000;
export const MAX_FLOOR = 60;
export const MAX_ADVANCE_DAYS = 365;

export interface OpeningFormValues {
  kind: OpeningKind | "";
  towerId: string;
  /** Digits only, kept as text so a half-typed value is never lost. */
  floor: string;
  bhk: number | null;
  furnishing: Furnishing | "";
  rent: string;
  deposit: string;
  maintenanceIncluded: boolean;
  maintenance: string;
  availableNow: boolean;
  /** yyyy-mm-dd, used when `availableNow` is off. */
  availableFrom: string;
  preference: OpeningPreference;
  included: OpeningIncluded[];
  description: string;
  contactMethod: OpeningContactMethod;
  phone: string;
}

export type OpeningFormField = keyof OpeningFormValues;
export type OpeningFormErrors = Partial<Record<OpeningFormField, string>>;

export function emptyOpeningForm(options: OpeningOptions): OpeningFormValues {
  return {
    kind: "",
    towerId: options.towerId ?? "",
    floor: "",
    bhk: null,
    furnishing: "",
    rent: "",
    deposit: "",
    maintenanceIncluded: true,
    maintenance: "",
    availableNow: true,
    availableFrom: "",
    preference: "anyone",
    included: [],
    description: "",
    contactMethod: "whatsapp",
    phone: "",
  };
}

export function openingFormFrom(opening: FlatOpeningDetail): OpeningFormValues {
  return {
    kind: opening.kind,
    towerId: opening.towerId,
    floor: opening.floor === null ? "" : String(opening.floor),
    bhk: opening.bhk,
    furnishing: opening.furnishing,
    rent: String(opening.rentInr),
    deposit: opening.depositInr === null ? "" : String(opening.depositInr),
    maintenanceIncluded: opening.maintenanceIncluded,
    maintenance: opening.maintenanceInr === null ? "" : String(opening.maintenanceInr),
    availableNow: opening.availableFrom === null,
    availableFrom: opening.availableFrom ?? "",
    preference: opening.preference,
    included: opening.included,
    description: opening.description,
    contactMethod: opening.contactMethod,
    phone: "",
  };
}

/** Switching kind keeps the chosen preference when it still fits, otherwise falls back to Anyone. */
export function preferenceAfterKind(kind: OpeningKind, current: OpeningPreference): OpeningPreference {
  return PREFERENCES_FOR[kind].includes(current) ? current : "anyone";
}

export function toggleIncluded(items: OpeningIncluded[], item: OpeningIncluded): OpeningIncluded[] {
  return items.includes(item) ? items.filter((existing) => existing !== item) : [...items, item];
}

/** Today in India as yyyy-mm-dd, matching how the API judges "not in the past". */
export function todayIst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function latestAvailableFrom(today: string = todayIst()): string {
  return addDays(today, MAX_ADVANCE_DAYS);
}

function amount(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

const PHONE_RE = /^\+?[0-9]{10,15}$/;

export function validateOpeningForm(
  values: OpeningFormValues,
  { needsPhone, today = todayIst() }: { needsPhone: boolean; today?: string },
): OpeningFormErrors {
  const errors: OpeningFormErrors = {};
  if (!values.kind) errors.kind = "Choose what you're posting.";
  if (!values.towerId) errors.towerId = "Choose your tower.";
  if (values.bhk === null) errors.bhk = "Choose the BHK.";
  if (!values.furnishing) errors.furnishing = "Choose how furnished it is.";

  const floor = amount(values.floor);
  if (floor !== null && floor > MAX_FLOOR) {
    errors.floor = `Floor can be up to ${MAX_FLOOR}. Use 0 for the ground floor.`;
  }

  const rent = amount(values.rent);
  if (rent === null) errors.rent = "Enter the monthly rent.";
  else if (rent < MIN_RENT || rent > MAX_RENT) {
    errors.rent = `Rent should be between ${formatInr(MIN_RENT)} and ${formatInr(MAX_RENT)}.`;
  }

  const deposit = amount(values.deposit);
  if (deposit !== null && (deposit < 1 || deposit > MAX_DEPOSIT)) {
    errors.deposit = `Deposit can be up to ${formatInr(MAX_DEPOSIT)}.`;
  }

  if (!values.maintenanceIncluded) {
    const maintenance = amount(values.maintenance);
    if (maintenance === null || maintenance < 1) errors.maintenance = "Enter the monthly maintenance amount.";
    else if (maintenance > MAX_MAINTENANCE) {
      errors.maintenance = `Maintenance can be up to ${formatInr(MAX_MAINTENANCE)}.`;
    }
  }

  if (!values.availableNow) {
    if (!values.availableFrom) errors.availableFrom = "Pick a date, or choose Available now.";
    else if (values.availableFrom < today || values.availableFrom > latestAvailableFrom(today)) {
      errors.availableFrom = "Pick today or a date within the next year.";
    }
  }

  if (values.kind && !PREFERENCES_FOR[values.kind].includes(values.preference)) {
    errors.preference = "Choose who it suits.";
  }

  const description = values.description.trim();
  if (!description) errors.description = "Add a short description.";
  else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  if (needsPhone) {
    const phone = values.phone.replace(/[\s-]/g, "");
    if (!phone) errors.phone = "Add your phone number so neighbours can reach you.";
    else if (!PHONE_RE.test(phone)) errors.phone = "Enter a valid phone number.";
  }
  return errors;
}

/** The API body. Call only after `validateOpeningForm` found nothing. */
export function openingPayload(values: OpeningFormValues, { needsPhone }: { needsPhone: boolean }) {
  const phone = values.phone.replace(/[\s-]/g, "");
  return {
    kind: values.kind as OpeningKind,
    towerId: values.towerId,
    floor: amount(values.floor),
    bhk: values.bhk as number,
    furnishing: values.furnishing as Furnishing,
    rentInr: amount(values.rent) as number,
    depositInr: amount(values.deposit),
    maintenanceIncluded: values.maintenanceIncluded,
    maintenanceInr: values.maintenanceIncluded ? null : amount(values.maintenance),
    availableFrom: values.availableNow ? null : values.availableFrom,
    preference: values.preference,
    included: values.included,
    description: values.description.trim(),
    contactMethod: values.contactMethod,
    ...(needsPhone && phone ? { phone } : {}),
  };
}

const TITLE_PLACEHOLDER = "Your title appears here";

/** The directory card for what has been entered so far. */
export function previewOpening(values: OpeningFormValues, options: OpeningOptions): FlatOpeningCard {
  const tower = options.towers.find((item) => item.id === values.towerId)?.name ?? "";
  const ready = values.kind !== "" && values.bhk !== null && tower !== "";
  const floor = amount(values.floor);
  return {
    id: "preview",
    kind: values.kind || "room_available",
    title: ready ? generateTitle(values.kind as OpeningKind, values.bhk as number, tower) : TITLE_PLACEHOLDER,
    rentInr: amount(values.rent) ?? 0,
    bhk: values.bhk ?? 1,
    tower,
    floor,
    furnishing: values.furnishing || "furnished",
    availableFrom: values.availableNow || !values.availableFrom ? null : values.availableFrom,
    preference: values.preference,
    description: values.description.trim() || "Your description appears here.",
    contactMethod: values.contactMethod,
    postedBy: options.firstName,
    postedAt: new Date().toISOString(),
    isMine: false,
    state: "active",
  };
}
