"use client";

import { apiGet, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import type { ContactLink } from "@/lib/contact-link";
import { browseQueryString, type BrowseFilters } from "@/lib/openings/view";
import type { FlatOpeningCard, FlatOpeningDetail } from "@/lib/types/flat-opening";

async function authHeaders(): Promise<HeadersInit> {
  return { Authorization: `Bearer ${await getBrowserAccessToken()}` };
}

function path(id: string, suffix = ""): string {
  return `/v1/flat-openings/${encodeURIComponent(id)}${suffix}`;
}

export async function fetchOpeningsApi(
  filters: BrowseFilters,
  signal?: AbortSignal,
): Promise<FlatOpeningCard[]> {
  return apiGet<FlatOpeningCard[]>(`/v1/flat-openings${browseQueryString(filters)}`, {
    headers: await authHeaders(),
    signal,
  });
}

export async function contactOpeningApi(id: string): Promise<ContactLink> {
  return apiPost<ContactLink>(path(id, "/contact"), {}, { headers: await authHeaders() });
}

export async function markFilledApi(id: string): Promise<FlatOpeningDetail> {
  return apiPost<FlatOpeningDetail>(path(id, "/fill"), {}, { headers: await authHeaders() });
}

/** The poster's "Still available": keeps the listing up for another 30 days. */
export async function renewOpeningApi(id: string): Promise<FlatOpeningDetail> {
  return apiPost<FlatOpeningDetail>(path(id, "/renew"), {}, { headers: await authHeaders() });
}

/** The poster deletes their own opening; the committee must give a reason. */
export async function removeOpeningApi(id: string, reason?: string): Promise<void> {
  await apiPost<void>(path(id, "/remove"), reason ? { reason } : {}, {
    headers: await authHeaders(),
  });
}
