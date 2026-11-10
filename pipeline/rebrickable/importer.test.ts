import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Db } from "../db/client";
import { FIXTURES, testDb } from "../test/helpers";
import { HeaderError, importRebrickable } from "./importer";

const DIR = path.join(FIXTURES, "rebrickable");
let db: Db;
beforeEach(async () => (db = await testDb()));
afterEach(async () => db.close());

describe("Rebrickable importer", () => {
  it("imports, rejects bad rows with reasons, merges duplicates", async () => {
    const r = await importRebrickable(db, { dir: DIR, sourceId: "test-fixture" });
    expect(r.tables.themes).toMatchObject({ rowsRead: 3, inserted: 2, rejected: 1 });
    expect(r.tables.themes!.rejects["parent theme not found"].count).toBe(1);
    expect(r.tables.colors!.rejects).toHaveProperty(["rgb: invalid rgb \"XYZXYZ\""]);
    expect(r.tables.parts).toMatchObject({ inserted: 4, duplicatesMerged: 1, rejected: 1 });
    expect((await db.query<{ name: string }>("SELECT name FROM parts WHERE part_num = '3001'")).rows[0].name).toBe("Brick 2 x 4 (dup)");
    expect(r.tables.part_relationships).toMatchObject({ inserted: 1, rejected: 2 });
    expect(r.tables.elements).toMatchObject({ inserted: 3, rejected: 1 });
    expect(r.tables.sets).toMatchObject({ inserted: 3, rejected: 1 });
    expect(r.tables.inventories).toMatchObject({ inserted: 4, rejected: 1 });
    expect(r.tables.inventories!.rejects["owner set or minifig not found"].examples[0]).toContain("99999-1");
    const ip = r.tables.inventory_parts!;
    expect(ip).toMatchObject({ rowsRead: 11, rejected: 1, duplicatesMerged: 1, inserted: 9 });
    const merged = (await db.query<{ quantity: number; source_lines: number }>(
      "SELECT quantity, source_lines FROM inventory_parts WHERE inventory_id = 1 AND part_num = '3001' AND color_id = 4 AND NOT is_spare",
    )).rows[0];
    expect(merged).toEqual({ quantity: 3, source_lines: 2 });
    // minifig inventory owner goes to fig_num, not set_num
    expect((await db.query("SELECT fig_num FROM inventories WHERE id = 4")).rows[0]).toEqual({ fig_num: "fig-900001" });
    // provenance recorded per table
    expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM provenance WHERE source_id = 'test-fixture'")).rows[0].n).toBe(12);
  });

  it("is idempotent: a second run changes nothing", async () => {
    await importRebrickable(db, { dir: DIR, sourceId: "test-fixture" });
    const r2 = await importRebrickable(db, { dir: DIR, sourceId: "test-fixture" });
    expect(r2.totals.inserted).toBe(0);
    expect(r2.totals.updated).toBe(0);
    expect(r2.totals.unchanged).toBeGreaterThan(0);
  });

  it("applies changes and removes stale inventory lines on re-import", async () => {
    await importRebrickable(db, { dir: DIR, sourceId: "test-fixture" });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rb-"));
    for (const f of fs.readdirSync(DIR)) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, "sets.csv"), fs.readFileSync(path.join(DIR, "sets.csv"), "utf8").replace("Test Car", "Test Car Mk2"));
    const ip = fs.readFileSync(path.join(DIR, "inventory_parts.csv"), "utf8").split("\n").filter((l) => !l.startsWith("2,3020,0,2"));
    fs.writeFileSync(path.join(tmp, "inventory_parts.csv"), ip.join("\n"));
    const r = await importRebrickable(db, { dir: tmp, sourceId: "test-fixture" });
    expect(r.tables.sets!.updated).toBe(1);
    expect(r.tables.inventory_parts!.deletedStale).toBe(1);
    expect((await db.query("SELECT name FROM sets WHERE set_num = '90002-1'")).rows[0]).toEqual({ name: "Test Car Mk2" });
  });

  it("limits inventories to chosen sets, following sub-sets and minifigs", async () => {
    const r = await importRebrickable(db, { dir: DIR, sourceId: "test-fixture", sets: ["90001-1"] });
    const inv = (await db.query<{ id: number }>("SELECT id FROM inventories ORDER BY id")).rows.map((x) => x.id);
    expect(inv).toEqual([1, 3, 4]); // set, its sub-set 90003-1, its minifig
    expect(r.tables.sets!.inserted).toBe(3); // catalog tables stay complete
  });

  it("stops on a changed header instead of loading shifted columns", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rb-"));
    for (const f of fs.readdirSync(DIR)) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, "themes.csv"), "id,title,parent_id\n1,X,\n");
    await expect(importRebrickable(db, { dir: tmp, sourceId: "test-fixture" })).rejects.toThrow(HeaderError);
    expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM themes")).rows[0].n).toBe(0);
  });
});
