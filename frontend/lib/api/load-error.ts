import { ApiError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";

/** User-facing copy when server components fail to load from FastAPI. */
export function formatApiLoadError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sign in again to load live data from the API.";
    }
    if (error.status === 403) {
      return "Your account is not linked to a society yet. Open Join to redeem an invite code.";
    }
    if (error.status === 0) {
      return `Could not reach the API at ${getApiBaseUrl()}. Check NEXT_PUBLIC_API_URL and that Railway is running.`;
    }
    if (error.message) {
      return error.message;
    }
  }
  return `Could not reach the API at ${getApiBaseUrl()}. Check NEXT_PUBLIC_API_URL and that Railway is running.`;
}
