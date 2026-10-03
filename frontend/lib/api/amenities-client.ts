"use client";

import { apiDelete } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import type { AmenityBooking } from "@/lib/types/amenities";

export async function cancelBookingApi(bookingId: string): Promise<AmenityBooking> {
  const token = await getBrowserAccessToken();
  return apiDelete<AmenityBooking>(`/v1/amenities/bookings/${encodeURIComponent(bookingId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
