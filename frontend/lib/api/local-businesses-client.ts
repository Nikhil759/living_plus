"use client";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { browseQueryString, type BrowseFilters } from "@/lib/local-businesses/view";
import type {
  BusinessAvailability,
  BusinessCard,
  BusinessContactMethod,
  BusinessDetail,
} from "@/lib/types/local-business";

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

function path(id: string, suffix = ""): string {
  return `/v1/local-businesses/${encodeURIComponent(id)}${suffix}`;
}

export async function followBusinessApi(id: string): Promise<BusinessDetail> {
  return apiPost<BusinessDetail>(path(id, "/follow"), {}, { headers: await authHeaders() });
}

export async function unfollowBusinessApi(id: string): Promise<BusinessDetail> {
  return apiDelete<BusinessDetail>(path(id, "/follow"), { headers: await authHeaders() });
}

export async function recommendBusinessApi(id: string, note: string): Promise<BusinessDetail> {
  return apiPost<BusinessDetail>(
    path(id, "/recommendation"),
    { note: note.trim() || null },
    { headers: await authHeaders() },
  );
}

export async function withdrawRecommendationApi(id: string): Promise<BusinessDetail> {
  return apiDelete<BusinessDetail>(path(id, "/recommendation"), { headers: await authHeaders() });
}

export async function postUpdateApi(id: string, text: string): Promise<BusinessDetail> {
  return apiPost<BusinessDetail>(path(id, "/updates"), { text }, { headers: await authHeaders() });
}

export async function setAvailabilityApi(
  id: string,
  availability: BusinessAvailability,
): Promise<BusinessDetail> {
  return apiPatch<BusinessDetail>(
    path(id, "/availability"),
    { availability },
    { headers: await authHeaders() },
  );
}

export async function setFeaturedApi(id: string, featured: boolean): Promise<BusinessDetail> {
  return apiPatch<BusinessDetail>(
    path(id, "/featured"),
    { featured },
    { headers: await authHeaders() },
  );
}

/** The owner's number only exists inside this on-demand link, never in a page. */
export async function contactBusinessApi(
  id: string,
): Promise<{ method: BusinessContactMethod; url: string }> {
  return apiPost<{ method: BusinessContactMethod; url: string }>(path(id, "/contact"), {}, {
    headers: await authHeaders(),
  });
}

export async function reviewBusinessApi(
  id: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<BusinessDetail> {
  return apiPost<BusinessDetail>(path(id, "/review"), { decision, reason }, {
    headers: await authHeaders(),
  });
}

export async function removeBusinessApi(id: string, reason: string): Promise<void> {
  await apiPost<void>(path(id, "/remove"), { reason }, { headers: await authHeaders() });
}

export async function removeNoteApi(
  id: string,
  recommendationId: string,
  reason: string,
): Promise<BusinessDetail> {
  return apiPost<BusinessDetail>(
    path(id, `/recommendations/${encodeURIComponent(recommendationId)}/remove-note`),
    { reason },
    { headers: await authHeaders() },
  );
}

export async function fetchPendingBusinessesApi(signal?: AbortSignal): Promise<BusinessCard[]> {
  return apiGet<BusinessCard[]>("/v1/local-businesses/pending", {
    headers: await authHeaders(),
    signal,
  });
}
