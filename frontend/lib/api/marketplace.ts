import { apiGetAsUser } from "@/lib/api/server-auth";
import type { SellerProfile } from "@/lib/types/marketplace";

export async function fetchSellerProfile(): Promise<SellerProfile> {
  return apiGetAsUser<SellerProfile>("/v1/marketplace/seller-profile");
}
