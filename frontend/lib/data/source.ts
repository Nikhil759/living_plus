export type DataSource = "static" | "api";

/** `static` (default) reads bundled JSON; `api` hits the FastAPI backend. */
export function getDataSource(): DataSource {
  const raw = process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase();
  return raw === "api" ? "api" : "static";
}
