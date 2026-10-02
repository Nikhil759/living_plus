import { apiGet } from "@/lib/api/client";
import type { HomeEvent } from "@/lib/types/home";

export async function fetchEvents(): Promise<HomeEvent[]> {
  return apiGet<HomeEvent[]>("/v1/events");
}

export async function fetchEventBySlug(slug: string): Promise<HomeEvent> {
  return apiGet<HomeEvent>(`/v1/events/${encodeURIComponent(slug)}`);
}
