/** Matches backend `amenities._slug`: used for `/images/amenities/<slug>.jpg`. */
export function amenityPhotoSlug(name: string): string {
  const ascii = name.normalize("NFKD").replace(/\p{M}/gu, "");
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function amenityImageUrl(name: string): string {
  return `/images/amenities/${amenityPhotoSlug(name)}.jpg`;
}

export function resolveAmenityImageSrc(amenity: {
  name: string;
  imageUrl?: string | null;
}): string {
  const url = amenity.imageUrl?.trim();
  return url || amenityImageUrl(amenity.name);
}
