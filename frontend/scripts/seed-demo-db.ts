/**
 * Rebuild frontend/.demo/demo.db from bundled JSON.
 * Usage: npm run demo:seed
 */
import { reseedDemoDatabase } from "@/lib/demo-store/db";
import { demoDbPath } from "@/lib/demo-store/config";

reseedDemoDatabase();
console.log(`Demo SQLite seeded at ${demoDbPath()}`);
