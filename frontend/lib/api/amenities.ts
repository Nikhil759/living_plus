import { apiGet } from "@/lib/api/client";
import { apiGetAsUser } from "@/lib/api/server-auth";
import type { AmenityBooking } from "@/lib/types/amenities";
import type { Amenity, DigestItem } from "@/lib/types/home";

export async function fetchAmenities(): Promise<Amenity[]> {
  return apiGetAsUser<Amenity[]>("/v1/amenities");
}

export async function fetchMyBookings(): Promise<AmenityBooking[]> {
  return apiGetAsUser<AmenityBooking[]>("/v1/amenities/bookings/mine");
}

export async function fetchAnnouncements(): Promise<DigestItem[]> {
  return apiGet<DigestItem[]>("/v1/announcements");
}
