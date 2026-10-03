import { apiGetAsUser } from "@/lib/api/server-auth";
import type { OpeningOptions } from "@/lib/types/flat-opening";

/** The viewer's first name, tower and phone status, plus the society's towers, for the form. */
export async function fetchOpeningOptions(): Promise<OpeningOptions> {
  return apiGetAsUser<OpeningOptions>("/v1/flat-openings/options");
}
