import { getApiBaseUrl } from "@/lib/api/config";

/** Uploaded photos live on the API host; bundled demo photos are served by the app. */
export function resolveListingPhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/v1/") ? `${getApiBaseUrl()}${url}` : url;
}
