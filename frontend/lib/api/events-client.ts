"use client";

import { apiDelete, apiPost, ApiError } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { HomeEvent } from "@/lib/types/home";

export interface EventCreateInput {
  title: string;
  locationLabel: string;
  startsAt: string;
  tags?: string[];
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

export async function createEventApi(body: EventCreateInput): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    "/v1/events",
    {
      title: body.title,
      locationLabel: body.locationLabel,
      startsAt: body.startsAt,
      eventType: "free",
      tags: body.tags ?? [],
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function rsvpEventApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiPost<HomeEvent>(
    `/v1/events/${encodeURIComponent(slug)}/rsvp`,
    { qty: 1 },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function leaveEventApi(slug: string): Promise<HomeEvent> {
  const token = await getBrowserAccessToken();
  return apiDelete<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}/rsvp`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
