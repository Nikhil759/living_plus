import path from "node:path";

export const DEMO_DB_VERSION = "4";

export const DEFAULT_RESIDENT_USER_ID = "__default__";

/** SQLite file under frontend/.demo/ (gitignored). */
export function demoDbPath(): string {
  const override = process.env.DEMO_SQLITE_PATH?.trim();
  if (override) return override;
  return path.join(process.cwd(), ".demo", "demo.db");
}

function isServerlessDeploy(): boolean {
  return process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
}

/**
 * Local demo CRUD + reads from SQLite (dev machine only).
 * On by default when UI uses bundled data; set DEMO_LOCAL_STORE=0 to force JSON imports only.
 * Disabled on Vercel/serverless — no writable SQLite; use static JSON or `api` mode instead.
 */
export function useDemoStore(): boolean {
  if (process.env.DEMO_LOCAL_STORE === "0") return false;
  if (isServerlessDeploy() && process.env.DEMO_LOCAL_STORE !== "1") return false;
  if (process.env.DEMO_LOCAL_STORE === "1") return true;
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase();
  return source !== "api";
}
