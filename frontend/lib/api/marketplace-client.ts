"use client";

import { apiGet } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { browseQueryString, type BrowseFilters } from "@/lib/marketplace/view";
import type { MarketplaceCard } from "@/lib/types/marketplace";

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
