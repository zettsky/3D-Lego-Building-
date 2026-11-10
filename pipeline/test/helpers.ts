import path from "node:path";
import { openDb, type Db } from "../db/client";
import { migrate } from "../db/migrate";
import { ROOT } from "../config";

export const FIXTURES = path.join(ROOT, "pipeline", "fixtures");

/** Fresh in-memory PGlite database with all migrations and the test-fixture source. */
export async function testDb(): Promise<Db> {
  const db = await openDb({ url: undefined });
  await migrate(db);
  await db.query(`INSERT INTO sources (id, name, decision, licence_summary) VALUES ('test-fixture', 'Test fixtures', 'download', 'Invented test data') ON CONFLICT DO NOTHING`);
  return db;
}
