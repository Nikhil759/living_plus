"use client";

import { apiGet } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { browseQueryString, type BrowseFilters } from "@/lib/local-businesses/view";
import type { BusinessCard } from "@/lib/types/local-business";

async function authHeaders(): Promise<HeadersInit> {
  return { Authorization: `Bearer ${await getBrowserAccessToken()}` };
}

export async function fetchBusinessesApi(
  filters: BrowseFilters,
  signal?: AbortSignal,
): Promise<BusinessCard[]> {
  return apiGet<BusinessCard[]>(`/v1/local-businesses${browseQueryString(filters)}`, {
    headers: await authHeaders(),
    signal,
  });
}

/** The viewer's own businesses, including pending and rejected ones. */
export async function fetchMyBusinessesApi(signal?: AbortSignal): Promise<BusinessCard[]> {
  return apiGet<BusinessCard[]>("/v1/local-businesses/mine", {
    headers: await authHeaders(),
    signal,
  });
}
