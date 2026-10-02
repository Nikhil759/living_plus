import type { RecurringMethod, RecurringRentStatus, RentPaymentStatus } from "@/lib/types/rent";

export const RENT_STATUS_LABEL: Record<RentPaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  processing: "Processing",
};

export const RECURRING_STATUS_LABEL: Record<RecurringRentStatus, string> = {
  active: "Active",
  paused: "Paused",
  not_set: "Not set up",
};

export const RECURRING_METHOD_LABEL: Record<RecurringMethod, string> = {
  upi_autopay: "UPI AutoPay",
  bank_mandate: "Bank e-mandate",
};

export function formatRentAmount(amountInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInr);
}

export function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatPaidOn(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
