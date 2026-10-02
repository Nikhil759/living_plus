import { apiGet } from "@/lib/api/client";
import type { Amenity, DigestItem } from "@/lib/types/home";

export async function fetchAmenities(): Promise<Amenity[]> {
  return apiGet<Amenity[]>("/v1/amenities");
}

export async function fetchAnnouncements(): Promise<DigestItem[]> {
  return apiGet<DigestItem[]>("/v1/announcements");
}
