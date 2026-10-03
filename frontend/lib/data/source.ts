export type DataSource = "static" | "api";

/** `static` reads bundled demo data; `api` hits the FastAPI backend. */
export function getDataSource(): DataSource {
  const raw = process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase();
  if (raw === "api") return "api";
  if (raw === "static") return "static";
  // Deployments that set an API URL should not silently serve stale static amenity ids.
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) return "api";
  return "static";
}
