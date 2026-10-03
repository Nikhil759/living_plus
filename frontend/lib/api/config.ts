/** Backend base URL (no trailing slash). */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return url.replace(/\/$/, "");
}

/**
 * Next.js `/api/*` stays on this origin (demo SQLite).
 * FastAPI paths (`/v1/...`) go to `NEXT_PUBLIC_API_URL`.
 */
export function resolveApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/api/")) return normalized;
  return `${getApiBaseUrl()}${normalized}`;
}
