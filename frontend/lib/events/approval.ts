import type { EventType, HomeEvent } from "@/lib/types/home";

export function eventNeedsApproval(eventType: EventType | undefined): boolean {
  return eventType === "paid" || eventType === "society";
}

export function approvalExplain(eventType: EventType | undefined): string | undefined {
  if (eventType === "paid") {
    return "Paid events need committee approval before neighbours can see them.";
  }
  if (eventType === "society") {
    return "Society events need committee approval before they go live.";
  }
  return undefined;
}

export function hostSubmitLabel(event?: HomeEvent, eventType: EventType = "free"): string {
  const status = event?.status ?? (event ? "published" : undefined);
  if (event && status !== "draft" && status !== "rejected") {
    return "Save changes";
  }
  if (eventNeedsApproval(eventType)) {
    return "Submit for approval";
  }
  return "Publish event";
}
