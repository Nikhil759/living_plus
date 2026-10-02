import { apiGet } from "@/lib/api/client";
import type { HomeData, Resident } from "@/lib/types/home";

export async function fetchHomeData(): Promise<HomeData> {
  return apiGet<HomeData>("/v1/home");
}

export async function fetchCurrentResident(): Promise<Resident> {
  return apiGet<Resident>("/v1/me");
}
