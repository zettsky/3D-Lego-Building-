/**
 * Applies db/migrations/NNNN_name.sql in order, once each, recording a checksum. A migration whose file
 * changed after it was applied is an error (write a new migration instead).
 */
import fs from "node:fs";
import path from "node:path";
import { sha256Hex } from "../lib/checksum";
import type { Db } from "./client";
import { ROOT } from "../config";

export const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY, name text NOT NULL, sha256 char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  const done = new Map(
    (await db.query<{ version: string; sha256: string }>("SELECT version, sha256 FROM schema_migrations")).rows.map((r) => [r.version, r.sha256]),
  );
  const result: MigrationResult = { applied: [], alreadyApplied: [] };
  for (const f of files) {
    const version = f.slice(0, 4);
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const sum = sha256Hex(sql.replace(/\r\n/g, "\n"));
    const prev = done.get(version);
    if (prev) {
      if (prev !== sum) throw new Error(`Migration ${f} was changed after it was applied (checksum mismatch). Add a new migration instead.`);
      result.alreadyApplied.push(f);
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("INSERT INTO schema_migrations (version, name, sha256) VALUES ($1, $2, $3)", [version, f, sum]);
    });
    result.applied.push(f);
  }
  return result;
}
