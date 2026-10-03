"use client";

import { ApiError, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { resolveApiUrl } from "@/lib/api/config";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import type { listingPayload } from "@/lib/marketplace/form";
import { browseQueryString, type BrowseFilters } from "@/lib/marketplace/view";
import type {
  ListingContactMethod,
  ListingStatus,
  MarketplaceCard,
  MarketplaceListing,
} from "@/lib/types/marketplace";

async function authHeaders(): Promise<HeadersInit> {
  return { Authorization: `Bearer ${await getBrowserAccessToken()}` };
}

export type MyListingsTab = "active" | "sold";

export async function fetchMyListingsApi(
  tab: MyListingsTab,
  signal?: AbortSignal,
): Promise<MarketplaceCard[]> {
  return apiGet<MarketplaceCard[]>(`/v1/marketplace/listings/mine?tab=${tab}`, {
    headers: await authHeaders(),
    signal,
  });
}

export async function fetchListingsApi(
  filters: BrowseFilters,
  signal?: AbortSignal,
): Promise<MarketplaceCard[]> {
  return apiGet<MarketplaceCard[]>(`/v1/marketplace/listings${browseQueryString(filters)}`, {
    headers: await authHeaders(),
    signal,
  });
}

function listingPath(id: string): string {
  return `/v1/marketplace/listings/${encodeURIComponent(id)}`;
}

export async function setListingStatusApi(
  id: string,
  status: ListingStatus,
): Promise<MarketplaceListing> {
  return apiPatch<MarketplaceListing>(
    `${listingPath(id)}/status`,
    { status },
    { headers: await authHeaders() },
  );
}

/** Seller deletes their own listing; the committee must give a reason. */
export async function removeListingApi(id: string, reason?: string): Promise<void> {
  await apiPost<void>(`${listingPath(id)}/remove`, reason ? { reason } : {}, {
    headers: await authHeaders(),
  });
}

export async function reportListingApi(id: string, reason: string): Promise<string> {
  const result = await apiPost<{ message: string }>(
    `${listingPath(id)}/report`,
    { reason },
    { headers: await authHeaders() },
  );
  return result.message;
}

/** The seller's number only exists inside this on-demand link, never in a page. */
export async function contactSellerApi(
  id: string,
): Promise<{ method: ListingContactMethod; url: string }> {
  return apiPost<{ method: ListingContactMethod; url: string }>(`${listingPath(id)}/contact`, {}, {
    headers: await authHeaders(),
  });
}

type ListingPayload = ReturnType<typeof listingPayload>;

export async function createListingApi(body: ListingPayload): Promise<MarketplaceListing> {
  return apiPost<MarketplaceListing>("/v1/marketplace/listings", body, {
    headers: await authHeaders(),
  });
}

export async function updateListingApi(
  id: string,
  body: ListingPayload,
): Promise<MarketplaceListing> {
  return apiPut<MarketplaceListing>(listingPath(id), body, { headers: await authHeaders() });
}

/** Returns the stored photo's URL. */
export async function uploadListingPhotoApi(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(resolveApiUrl("/v1/uploads/listing-photos"), {
    method: "POST",
    headers: { Accept: "application/json", ...(await authHeaders()) },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, response.status);
  }
  return ((await response.json()) as { url: string }).url;
}
