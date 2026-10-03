"use client";

import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
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
