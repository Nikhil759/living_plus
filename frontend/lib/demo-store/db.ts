import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DEMO_DB_VERSION, demoDbPath } from "@/lib/demo-store/config";
import { seedDemoDatabaseFromStatic } from "@/lib/demo-store/seed-from-static";

const globalForDemo = globalThis as unknown as { demoSqlite?: Database.Database };

function readSchema(): string {
  const schemaPath = path.join(process.cwd(), "lib", "demo-store", "schema.sql");
  return fs.readFileSync(schemaPath, "utf8");
}

function applySchema(db: Database.Database): void {
  db.exec(readSchema());
}

function markSeeded(db: Database.Database): void {
  db.prepare(
    "INSERT INTO demo_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run("schema_version", DEMO_DB_VERSION);
}

function needsSeed(db: Database.Database): boolean {
  const row = db.prepare("SELECT value FROM demo_meta WHERE key = ?").get("schema_version") as
    | { value: string }
    | undefined;
  return row?.value !== DEMO_DB_VERSION;
}

export function getDemoDb(): Database.Database {
  if (globalForDemo.demoSqlite) {
    return globalForDemo.demoSqlite;
  }

  const filePath = demoDbPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applySchema(db);

  if (needsSeed(db)) {
    const reseed = db.transaction(() => {
      db.exec("DELETE FROM demo_meta");
      db.exec("DELETE FROM demo_blob");
      db.exec("DELETE FROM demo_entity");
      db.exec("DELETE FROM demo_resident");
      db.exec("DELETE FROM demo_event_rsvp");
      seedDemoDatabaseFromStatic(db);
      markSeeded(db);
    });
    reseed();
  }

  globalForDemo.demoSqlite = db;
  return db;
}

/** Force rebuild from bundled JSON (npm run demo:seed). */
export function reseedDemoDatabase(): void {
  const db = getDemoDb();
  const reseed = db.transaction(() => {
    db.exec("DELETE FROM demo_meta");
    db.exec("DELETE FROM demo_blob");
    db.exec("DELETE FROM demo_entity");
    db.exec("DELETE FROM demo_resident");
    db.exec("DELETE FROM demo_event_rsvp");
    seedDemoDatabaseFromStatic(db);
    markSeeded(db);
  });
  reseed();
}
