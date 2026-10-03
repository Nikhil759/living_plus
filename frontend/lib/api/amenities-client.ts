"use client";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import type {
  AmenityBooking,
  AmenityCrowd,
  AmenityDetail,
  AmenitySlots,
} from "@/lib/types/amenities";

export async function cancelBookingApi(bookingId: string): Promise<AmenityBooking> {
  const token = await getBrowserAccessToken();
  return apiDelete<AmenityBooking>(`/v1/amenities/bookings/${encodeURIComponent(bookingId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function authHeaders(): Promise<HeadersInit> {
  return { Authorization: `Bearer ${await getBrowserAccessToken()}` };
}

function base(amenityId: string): string {
  return `/v1/amenities/${encodeURIComponent(amenityId)}`;
}

export async function fetchSlotsApi(amenityId: string, day: string): Promise<AmenitySlots> {
  return apiGet<AmenitySlots>(`${base(amenityId)}/slots?day=${day}`, {
    headers: await authHeaders(),
  });
}

export async function fetchCrowdApi(amenityId: string, day: string): Promise<AmenityCrowd> {
  return apiGet<AmenityCrowd>(`${base(amenityId)}/crowd?day=${day}`, {
    headers: await authHeaders(),
  });
}

export async function bookSlotApi(amenityId: string, startsAt: string): Promise<AmenityBooking> {
  return apiPost<AmenityBooking>(
    `${base(amenityId)}/bookings`,
    { startsAt },
    { headers: await authHeaders() },
  );
}

export async function setClosureApi(
  amenityId: string,
  closed: boolean,
  note?: string,
): Promise<AmenityDetail> {
  return apiPatch<AmenityDetail>(
    `${base(amenityId)}/status`,
    { closed, note },
    { headers: await authHeaders() },
  );
}
