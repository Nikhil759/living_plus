/** Backend base URL (no trailing slash or `/v1` suffix). */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  let url = raw.trim().replace(/\/+$/, "");
  if (url.endsWith("/v1")) {
    url = url.slice(0, -3);
  }
  return url;
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
