import { cache } from "react";
import { ApiError } from "@/lib/api/client";
import { fetchCurrentResident } from "@/lib/api/home";
import { getServerAccessToken } from "@/lib/api/server-auth";
import { loadSessionResidentFallback } from "@/lib/auth/session-resident";
import { useDemoStore } from "@/lib/demo-store/config";
import { demoGetResidentForUser } from "@/lib/demo-store/readers";
import { mergeSessionIntoResident } from "@/lib/demo-store/resident-write";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import { getDataSource } from "@/lib/data/source";
import type { Resident } from "@/lib/types/home";

/** One resident fetch per RSC request (layout + pages share the same result). */
export const loadResident = cache(async (): Promise<Resident> => {
  if (useDemoStore()) {
    const session = await getDemoSessionUser();
    if (session) {
      return mergeSessionIntoResident(demoGetResidentForUser(session.id), session);
    }
    return demoGetResidentForUser(null);
  }

  if (getDataSource() === "static") {
    const { getStaticResident } = await import("@/lib/data/static");
    return getStaticResident();
  }

  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError("Sign in required.", 401, "unauthorised");
  }

  try {
    return await fetchCurrentResident();
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      throw err;
    }
    const sessionResident = await loadSessionResidentFallback();
    if (sessionResident) return sessionResident;
    throw err;
  }
});
