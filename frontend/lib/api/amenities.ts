import { apiGet, ApiError } from "@/lib/api/client";
import { apiGetAsUser } from "@/lib/api/server-auth";
import type { AmenityBooking, AmenityDetail } from "@/lib/types/amenities";
import type { Amenity, DigestItem } from "@/lib/types/home";

export async function fetchAmenities(): Promise<Amenity[]> {
  return apiGetAsUser<Amenity[]>("/v1/amenities");
}

/** Null when the amenity does not exist in the viewer's society. */
export async function fetchAmenity(id: string): Promise<AmenityDetail | null> {
  try {
    return await apiGetAsUser<AmenityDetail>(`/v1/amenities/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return null;
    throw error;
  }
}

export async function fetchMyBookings(): Promise<AmenityBooking[]> {
  return apiGetAsUser<AmenityBooking[]>("/v1/amenities/bookings/mine");
}

export async function fetchAnnouncements(): Promise<DigestItem[]> {
  return apiGet<DigestItem[]>("/v1/announcements");
}
