"use client";

import { apiDelete, apiPatch, apiPost, ApiError } from "@/lib/api/client";
import { resolveApiUrl } from "@/lib/api/config";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { EventCategory, EventRecurrence, EventType, HomeEvent, StallCategory } from "@/lib/types/home";

export interface EventWriteInput {
  title: string;
  locationLabel: string;
  startsAt: string;
  endsAt?: string;
  description?: string | null;
  category?: EventCategory;
  capacity?: number;
  guestLimit?: number;
  whatToBring?: string | null;
  coverUrl?: string | null;
  tags?: string[];
  eventType?: EventType;
  priceInr?: number;
  recurrence?: EventRecurrence;
  recurrenceCount?: number;
  saveAsDraft?: boolean;
  publish?: boolean;
  stallsEnabled?: boolean;
  stallCount?: number;
  stallFeeInr?: number;
  stallCategories?: StallCategory[];
  stallApplicationDeadline?: string | null;
  amenityId?: string;
}

async function getBrowserAccessToken(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new ApiError("Missing access token.", 401, "unauthorised");
  }
  return token;
}

function writeBody(body: EventWriteInput): Record<string, unknown> {
  return {
    title: body.title,
    locationLabel: body.locationLabel,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    description: body.description,
    category: body.category,
    capacity: body.capacity,
    guestLimit: body.guestLimit,
    whatToBring: body.whatToBring,
    coverUrl: body.coverUrl,
    tags: body.tags ?? [],
    eventType: body.eventType ?? "free",
    priceInr: body.priceInr,
    recurrence: body.recurrence,
    recurrenceCount: body.recurrenceCount,
    saveAsDraft: body.saveAsDraft,
    publish: body.publish,
    stallsEnabled: body.stallsEnabled,
    stallCount: body.stallCount,
    stallFeeInr: body.stallFeeInr,
    stallCategories: body.stallCategories,
    stallApplicationDeadline: body.stallApplicationDeadline,
    amenityId: body.amenityId,
  };
}

export async function createEventApi(body: EventWriteInput): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>("/v1/events", writeBody(body), {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadEventCoverApi(file: File): Promise<string> {
  const token = await getBrowserAccessToken();
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(resolveApiUrl("/v1/uploads/event-covers"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(message, response.status);
  }
  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function updateEventApi(slug: string, body: EventWriteInput): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPatch<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}`, writeBody(body), {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function rsvpEventApi(slug: string, qty = 1): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/rsvp`,
    { qty },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function joinWaitlistApi(slug: string, qty = 1): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/waitlist`,
    { qty },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function leaveWaitlistApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiDelete<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/waitlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function leaveEventApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiDelete<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/rsvp`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelEventApi(
  slug: string,
  reason: string,
  scope: "this" | "series" = "this",
): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/cancel`,
    { reason, scope },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function duplicateEventApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/duplicate`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function approveEventApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function applyStallApi(
  slug: string,
  body: { stallType: string; description?: string },
): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/stalls`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function approveStallApi(slug: string, applicationId: string, spotNo: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/stalls/${encodeURIComponent(applicationId)}/approve`,
    { spotNo },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function rejectStallApi(slug: string, applicationId: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/stalls/${encodeURIComponent(applicationId)}/reject`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function rejectEventApi(slug: string, reason: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/reject`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function createEventDemo(body: {
  title: string;
  location: string;
  startsAt: string;
  tags?: string[];
}): Promise<HomeEvent> {
  return apiPost<HomeEvent>("/api/demo/events", body);
}

export async function rsvpEventDemo(eventId: string): Promise<HomeEvent> {
  return apiPost<HomeEvent>(`/api/demo/events/${encodeURIComponent(eventId)}/rsvp`, {});
}
