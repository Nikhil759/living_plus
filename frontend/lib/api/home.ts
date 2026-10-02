import { apiGetAsUser } from "@/lib/api/server-auth";
import type { HomeData, Resident } from "@/lib/types/home";

export async function fetchHomeData(): Promise<HomeData> {
  return apiGetAsUser<HomeData>("/v1/home");
}

export async function fetchCurrentResident(): Promise<Resident> {
  return apiGetAsUser<Resident>("/v1/me");
}
