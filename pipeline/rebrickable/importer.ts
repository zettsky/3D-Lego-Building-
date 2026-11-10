/**
 * Rebrickable catalog importer: fetch (conditional GET) or read local CSVs → validate headers and types →
 * stage in temp tables → reject rows with dangling references → upsert → report.
 *
 * Safe to re-run: upserts only touch rows whose data changed, duplicates in a file are merged
 * deterministically (last row wins; inventory lines are summed), and the whole import is one transaction.
 *
 * Inventories can be limited to a list of sets (`sets`), which also pulls in their sub-sets and minifigs.
 * Themes, colours, parts, elements, sets and minifigs are always imported in full (they are small).
 */
import fs from "node:fs";
import path from "node:path";
import type { Db } from "../db/client";
import { sha256File } from "../lib/checksum";
import { readCsvRows } from "../lib/csv";
import { fetchToFile, type FetchLike } from "../lib/http";
import { checkHeader, IMPORT_ORDER, REBRICKABLE_TABLES, typeRow, type Cell, type RebrickableTable } from "./tables";

export const REBRICKABLE_CDN = "https://cdn.rebrickable.com/media/downloads";
export const REBRICKABLE_LICENCE = "Rebrickable data; terms at https://rebrickable.com/terms/ (owner to confirm, see docs/data/SOURCES.md)";

export interface ImportOptions {
  /** Directory holding <table>.csv or <table>.csv.gz. */
  dir: string;
  /** Download into `dir` first (conditional GET against the CDN). */
  download?: boolean;
  /** Limit inventories to these set numbers (plus their sub-sets and minifigs). Omit for all. */
  sets?: string[];
  /** Source id recorded in provenance (tests use 'test-fixture'). */
  sourceId?: string;
  fetchImpl?: FetchLike;
  noDelay?: boolean;
  log?: (msg: string) => void;
}

export interface TableReport {
  file: string;
  sha256: string;
  downloaded?: boolean;
  rowsRead: number;
  staged: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicatesMerged: number;
  rejected: number;
  rejects: Record<string, { count: number; examples: string[] }>;
  deletedStale: number;
  staleInDb: number;
  extraColumns: string[];
}

export interface ImportReport {
  startedAt: string;
  finishedAt: string;
  filter: string[] | null;
  tables: Partial<Record<RebrickableTable, TableReport>>;
  totals: { inserted: number; updated: number; unchanged: number; rejected: number };
}

export class HeaderError extends Error {}

const MAX_EXAMPLES = 5;
const BATCH = 5000;

export async function importRebrickable(db: Db, opts: ImportOptions): Promise<ImportReport> {
  const log = opts.log ?? (() => {});
  const sourceId = opts.sourceId ?? "rebrickable";
  const startedAt = new Date().toISOString();
  const files = new Map<RebrickableTable, { file: string; sha256: string; downloaded?: boolean; etag?: string | null; lastModified?: string | null; url?: string }>();

  for (const t of IMPORT_ORDER) {
    if (opts.download) {
      const file = path.join(opts.dir, `${t}.csv.gz`);
      const meta = await fetchToFile(`${REBRICKABLE_CDN}/${t}.csv.gz`, file, { fetchImpl: opts.fetchImpl, noDelay: opts.noDelay });
      log(`${t}: ${meta.changed ? "downloaded" : "not modified (304)"}`);
      files.set(t, { file, sha256: meta.sha256, downloaded: meta.changed, etag: meta.etag, lastModified: meta.lastModified, url: meta.url });
    } else {
      const file = [`${t}.csv.gz`, `${t}.csv`].map((f) => path.join(opts.dir, f)).find((f) => fs.existsSync(f));
      if (!file) throw new Error(`Missing ${t}.csv(.gz) in ${opts.dir}`);
      files.set(t, { file, sha256: await sha256File(file) });
    }
  }

  // Which inventories to load (pre-pass over the small inventory files).
  const filter = opts.sets ? await resolveInventoryFilter(files, opts.sets) : null;

  const report: ImportReport = { startedAt, finishedAt: "", filter: opts.sets ?? null, tables: {}, totals: { inserted: 0, updated: 0, unchanged: 0, rejected: 0 } };

  await db.transaction(async (tx) => {
    for (const t of IMPORT_ORDER) {
      const f = files.get(t)!;
      const prov = await tx.query<{ id: number }>(
        `INSERT INTO provenance (source_id, url, licence, sha256, etag, last_modified, byte_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [sourceId, f.url ?? `file:${path.basename(f.file)}`, REBRICKABLE_LICENCE, f.sha256, f.etag ?? null, f.lastModified ?? null, fs.statSync(f.file).size, `table ${t}`],
      );
      const r = await importTable(tx, t, f.file, prov.rows[0].id, filter, sourceId);
      r.sha256 = f.sha256;
      r.downloaded = f.downloaded;
      report.tables[t] = r;
      report.totals.inserted += r.inserted;
      report.totals.updated += r.updated;
      report.totals.unchanged += r.unchanged;
      report.totals.rejected += r.rejected;
      log(`${t}: read ${r.rowsRead}, +${r.inserted} ~${r.updated} =${r.unchanged}, dup ${r.duplicatesMerged}, rejected ${r.rejected}`);
    }
  });
  report.finishedAt = new Date().toISOString();
  return report;
}

interface InventoryFilter {
  inventoryIds: Set<number>;
  setNums: Set<string>;
  figNums: Set<string>;
}

async function resolveInventoryFilter(files: Map<RebrickableTable, { file: string }>, sets: string[]): Promise<InventoryFilter> {
  const invOwner = new Map<number, string>();
  for await (const r of rows(files.get("inventories")!.file)) invOwner.set(Number(r.id), r.set_num);
  const subSets = new Map<number, string[]>();
  for await (const r of rows(files.get("inventory_sets")!.file)) subSets.set(Number(r.inventory_id), [...(subSets.get(Number(r.inventory_id)) ?? []), r.set_num]);
  const figsOf = new Map<number, string[]>();
  for await (const r of rows(files.get("inventory_minifigs")!.file)) figsOf.set(Number(r.inventory_id), [...(figsOf.get(Number(r.inventory_id)) ?? []), r.fig_num]);

  const setNums = new Set(sets);
  const figNums = new Set<string>();
  const inventoryIds = new Set<number>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, owner] of invOwner) {
      if (inventoryIds.has(id) || !(setNums.has(owner) || figNums.has(owner))) continue;
      inventoryIds.add(id);
      grew = true;
      for (const s of subSets.get(id) ?? []) setNums.add(s);
      for (const fg of figsOf.get(id) ?? []) figNums.add(fg);
    }
  }
  return { inventoryIds, setNums, figNums };
}

async function* rows(file: string): AsyncGenerator<Record<string, string>> {
  let header: string[] | null = null;
  for await (const raw of readCsvRows(file)) {
    if (!header) {
      header = raw.map((h, i) => (i === 0 ? h.replace(/^﻿/, "") : h));
      continue;
    }
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = raw[i]));
    yield o;
  }
}

// ---------------------------------------------------------------- per-table SQL

interface TablePlan {
  /** staging columns (name pgtype), in the order of the spec columns that are kept */
  stage: [string, string][];
  /** spec column name → staging column (columns not listed are dropped, e.g. img_url of inventory_parts) */
  pick: string[];
  key: string[];
  /** reject checks run against the staging table: rows matching `where` are rejected with `reason` */
  checks: { reason: string; where: string }[];
  /** upsert from the de-duplicated stage view `d` */
  upsert: (prov: string) => string;
  /** true when the filter limits this table; then stale child rows of the chosen inventories are deleted */
  inventoryChild?: boolean;
  /** count of target rows absent from stage (catalog tables, full imports only) */
  staleSql?: string;
  /** row filter applied before staging */
  keep?: (cells: Record<string, Cell>, f: InventoryFilter) => boolean;
  /** aggregate duplicates (inventory_parts) instead of last-wins */
  aggregate?: string;
}

const notIn = (col: string, table: string, key: string) => `NOT EXISTS (SELECT 1 FROM ${table} x WHERE x.${key} = s.${col})`;

const PLANS: Record<RebrickableTable, TablePlan> = {
  themes: {
    stage: [["id", "int"], ["name", "text"], ["parent_id", "int"]],
    pick: ["id", "name", "parent_id"],
    key: ["id"],
    checks: [{ reason: "parent theme not found", where: `s.parent_id IS NOT NULL AND ${notIn("parent_id", "themes", "id")} AND NOT EXISTS (SELECT 1 FROM s_themes p WHERE p.id = s.parent_id)` }],
    upsert: (p) => `INSERT INTO themes (id, name, parent_id, provenance_id) SELECT id, name, parent_id, ${p} FROM d
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, provenance_id = EXCLUDED.provenance_id, updated_at = now()
      WHERE (themes.name, themes.parent_id) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.parent_id)`,
    staleSql: `SELECT count(*)::int AS n FROM themes t WHERE NOT EXISTS (SELECT 1 FROM s_themes s WHERE s.id = t.id)`,
  },
  colors: {
    stage: [["id", "int"], ["name", "text"], ["rgb", "text"], ["is_trans", "boolean"]],
    pick: ["id", "name", "rgb", "is_trans"],
    key: ["id"],
    checks: [],
    upsert: (p) => `INSERT INTO colors (id, name, rgb, is_trans, provenance_id) SELECT id, name, rgb, is_trans, ${p} FROM d
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rgb = EXCLUDED.rgb, is_trans = EXCLUDED.is_trans, provenance_id = EXCLUDED.provenance_id, updated_at = now()
      WHERE (colors.name, colors.rgb, colors.is_trans) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.rgb, EXCLUDED.is_trans)`,
    staleSql: `SELECT count(*)::int AS n FROM colors t WHERE NOT EXISTS (SELECT 1 FROM s_colors s WHERE s.id = t.id)`,
  },
  part_categories: {
    stage: [["id", "int"], ["name", "text"]],
    pick: ["id", "name"],
    key: ["id"],
    checks: [],
    upsert: (p) => `INSERT INTO part_categories (id, name, provenance_id) SELECT id, name, ${p} FROM d
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, provenance_id = EXCLUDED.provenance_id
      WHERE part_categories.name IS DISTINCT FROM EXCLUDED.name`,
  },
  parts: {
    stage: [["part_num", "text"], ["name", "text"], ["part_cat_id", "int"], ["part_material", "text"]],
    pick: ["part_num", "name", "part_cat_id", "part_material"],
    key: ["part_num"],
    checks: [{ reason: "part category not found", where: notIn("part_cat_id", "part_categories", "id") }],
    upsert: (p) => `INSERT INTO parts (part_num, name, category_id, material, provenance_id) SELECT part_num, name, part_cat_id, part_material, ${p} FROM d
      ON CONFLICT (part_num) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, material = EXCLUDED.material, provenance_id = EXCLUDED.provenance_id, updated_at = now()
      WHERE (parts.name, parts.category_id, parts.material) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.category_id, EXCLUDED.material)`,
    staleSql: `SELECT count(*)::int AS n FROM parts t WHERE NOT EXISTS (SELECT 1 FROM s_parts s WHERE s.part_num = t.part_num)`,
  },
  part_relationships: {
    stage: [["rel_type", "text"], ["child_part_num", "text"], ["parent_part_num", "text"]],
    pick: ["rel_type", "child_part_num", "parent_part_num"],
    key: ["rel_type", "child_part_num", "parent_part_num"],
    checks: [
      { reason: "unknown relationship type", where: `s.rel_type NOT IN ('P','R','B','M','T','A')` },
      { reason: "child part not found", where: notIn("child_part_num", "parts", "part_num") },
      { reason: "parent part not found", where: notIn("parent_part_num", "parts", "part_num") },
    ],
    upsert: (p) => `INSERT INTO part_relationships (rel_type, child_part_num, parent_part_num, provenance_id) SELECT rel_type, child_part_num, parent_part_num, ${p} FROM d
      ON CONFLICT DO NOTHING`,
  },
  elements: {
    stage: [["element_id", "text"], ["part_num", "text"], ["color_id", "int"], ["design_id", "text"]],
    pick: ["element_id", "part_num", "color_id", "design_id"],
    key: ["element_id"],
    checks: [
      { reason: "part not found", where: notIn("part_num", "parts", "part_num") },
      { reason: "colour not found", where: notIn("color_id", "colors", "id") },
    ],
    upsert: (p) => `INSERT INTO elements (element_id, part_num, color_id, design_id, source_id, provenance_id) SELECT element_id, part_num, color_id, design_id, $SOURCE, ${p} FROM d
      ON CONFLICT (element_id) DO UPDATE SET part_num = EXCLUDED.part_num, color_id = EXCLUDED.color_id, design_id = EXCLUDED.design_id, provenance_id = EXCLUDED.provenance_id
      WHERE (elements.part_num, elements.color_id, elements.design_id) IS DISTINCT FROM (EXCLUDED.part_num, EXCLUDED.color_id, EXCLUDED.design_id)`,
  },
  sets: {
    stage: [["set_num", "text"], ["name", "text"], ["year", "int"], ["theme_id", "int"], ["num_parts", "int"], ["img_url", "text"]],
    pick: ["set_num", "name", "year", "theme_id", "num_parts", "img_url"],
    key: ["set_num"],
    checks: [
      { reason: "theme not found", where: notIn("theme_id", "themes", "id") },
      { reason: "year out of range", where: `s.year NOT BETWEEN 1940 AND 2100` },
      { reason: "negative part count", where: `s.num_parts < 0` },
    ],
    upsert: (p) => `INSERT INTO sets (set_num, name, year, theme_id, num_parts, image_url, provenance_id) SELECT set_num, name, year, theme_id, num_parts, img_url, ${p} FROM d
      ON CONFLICT (set_num) DO UPDATE SET name = EXCLUDED.name, year = EXCLUDED.year, theme_id = EXCLUDED.theme_id, num_parts = EXCLUDED.num_parts, image_url = EXCLUDED.image_url, provenance_id = EXCLUDED.provenance_id, updated_at = now()
      WHERE (sets.name, sets.year, sets.theme_id, sets.num_parts, sets.image_url) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.year, EXCLUDED.theme_id, EXCLUDED.num_parts, EXCLUDED.image_url)`,
    staleSql: `SELECT count(*)::int AS n FROM sets t WHERE NOT EXISTS (SELECT 1 FROM s_sets s WHERE s.set_num = t.set_num)`,
  },
  minifigs: {
    stage: [["fig_num", "text"], ["name", "text"], ["num_parts", "int"], ["img_url", "text"]],
    pick: ["fig_num", "name", "num_parts", "img_url"],
    key: ["fig_num"],
    checks: [],
    upsert: (p) => `INSERT INTO minifigs (fig_num, name, num_parts, image_url, provenance_id) SELECT fig_num, name, num_parts, img_url, ${p} FROM d
      ON CONFLICT (fig_num) DO UPDATE SET name = EXCLUDED.name, num_parts = EXCLUDED.num_parts, image_url = EXCLUDED.image_url, provenance_id = EXCLUDED.provenance_id, updated_at = now()
      WHERE (minifigs.name, minifigs.num_parts, minifigs.image_url) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.num_parts, EXCLUDED.image_url)`,
  },
  inventories: {
    stage: [["id", "int"], ["version", "int"], ["set_num", "text"]],
    pick: ["id", "version", "set_num"],
    key: ["id"],
    keep: (r, f) => f.inventoryIds.has(r.id as number),
    checks: [
      { reason: "owner set or minifig not found", where: `${notIn("set_num", "sets", "set_num")} AND ${notIn("set_num", "minifigs", "fig_num")}` },
      { reason: "invalid version", where: `s.version < 1` },
    ],
    upsert: (p) => `INSERT INTO inventories (id, version, set_num, fig_num, provenance_id)
      SELECT id, version, CASE WHEN set_num LIKE 'fig-%' THEN NULL ELSE set_num END, CASE WHEN set_num LIKE 'fig-%' THEN set_num END, ${p} FROM d
      ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, set_num = EXCLUDED.set_num, fig_num = EXCLUDED.fig_num, provenance_id = EXCLUDED.provenance_id
      WHERE (inventories.version, inventories.set_num, inventories.fig_num) IS DISTINCT FROM (EXCLUDED.version, EXCLUDED.set_num, EXCLUDED.fig_num)`,
  },
  inventory_sets: {
    stage: [["inventory_id", "int"], ["set_num", "text"], ["quantity", "int"]],
    pick: ["inventory_id", "set_num", "quantity"],
    key: ["inventory_id", "set_num"],
    keep: (r, f) => f.inventoryIds.has(r.inventory_id as number),
    inventoryChild: true,
    checks: [
      { reason: "inventory not found", where: notIn("inventory_id", "inventories", "id") },
      { reason: "sub-set not found", where: notIn("set_num", "sets", "set_num") },
      { reason: "quantity must be positive", where: `s.quantity <= 0` },
    ],
    upsert: (p) => `INSERT INTO inventory_sets (inventory_id, set_num, quantity) SELECT inventory_id, set_num, quantity FROM d
      ON CONFLICT (inventory_id, set_num) DO UPDATE SET quantity = EXCLUDED.quantity WHERE inventory_sets.quantity IS DISTINCT FROM EXCLUDED.quantity /* ${p} */`,
  },
  inventory_minifigs: {
    stage: [["inventory_id", "int"], ["fig_num", "text"], ["quantity", "int"]],
    pick: ["inventory_id", "fig_num", "quantity"],
    key: ["inventory_id", "fig_num"],
    keep: (r, f) => f.inventoryIds.has(r.inventory_id as number),
    inventoryChild: true,
    checks: [
      { reason: "inventory not found", where: notIn("inventory_id", "inventories", "id") },
      { reason: "minifig not found", where: notIn("fig_num", "minifigs", "fig_num") },
      { reason: "quantity must be positive", where: `s.quantity <= 0` },
    ],
    upsert: (p) => `INSERT INTO inventory_minifigs (inventory_id, fig_num, quantity) SELECT inventory_id, fig_num, quantity FROM d
      ON CONFLICT (inventory_id, fig_num) DO UPDATE SET quantity = EXCLUDED.quantity WHERE inventory_minifigs.quantity IS DISTINCT FROM EXCLUDED.quantity /* ${p} */`,
  },
  inventory_parts: {
    stage: [["inventory_id", "int"], ["part_num", "text"], ["color_id", "int"], ["quantity", "int"], ["is_spare", "boolean"]],
    pick: ["inventory_id", "part_num", "color_id", "quantity", "is_spare"],
    key: ["inventory_id", "part_num", "color_id", "is_spare"],
    keep: (r, f) => f.inventoryIds.has(r.inventory_id as number),
    inventoryChild: true,
    aggregate: `SELECT inventory_id, part_num, color_id, is_spare, sum(quantity)::int AS quantity, count(*)::int AS source_lines FROM s_inventory_parts GROUP BY inventory_id, part_num, color_id, is_spare`,
    checks: [
      { reason: "inventory not found", where: notIn("inventory_id", "inventories", "id") },
      { reason: "part not found", where: notIn("part_num", "parts", "part_num") },
      { reason: "colour not found", where: notIn("color_id", "colors", "id") },
      { reason: "quantity must be positive", where: `s.quantity <= 0` },
    ],
    upsert: (p) => `INSERT INTO inventory_parts (inventory_id, part_num, color_id, is_spare, quantity, source_lines) SELECT inventory_id, part_num, color_id, is_spare, quantity, source_lines FROM d
      ON CONFLICT (inventory_id, part_num, color_id, is_spare) DO UPDATE SET quantity = EXCLUDED.quantity, source_lines = EXCLUDED.source_lines
      WHERE (inventory_parts.quantity, inventory_parts.source_lines) IS DISTINCT FROM (EXCLUDED.quantity, EXCLUDED.source_lines) /* ${p} */`,
  },
};

async function importTable(tx: Db, t: RebrickableTable, file: string, provId: number, filter: InventoryFilter | null, sourceId: string): Promise<TableReport> {
  const spec = REBRICKABLE_TABLES[t];
  const plan = PLANS[t];
  const s = `s_${t}`;
  const rep: TableReport = {
    file: path.basename(file),
    sha256: "",
    rowsRead: 0,
    staged: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    duplicatesMerged: 0,
    rejected: 0,
    rejects: {},
    deletedStale: 0,
    staleInDb: 0,
    extraColumns: [],
  };
  const reject = (reason: string, example: string) => {
    rep.rejected++;
    const r = (rep.rejects[reason] ??= { count: 0, examples: [] });
    r.count++;
    if (r.examples.length < MAX_EXAMPLES) r.examples.push(example);
  };

  await tx.exec(`DROP TABLE IF EXISTS ${s}; CREATE TEMP TABLE ${s} (${plan.stage.map(([n, ty]) => `${n} ${ty}`).join(", ")}, line int) ON COMMIT DROP`);

  let header: string[] | null = null;
  let hc: ReturnType<typeof checkHeader> | null = null;
  let batch: Cell[][] = [];
  let line = 1;
  const flush = async () => {
    if (!batch.length) return;
    const cols = [...plan.stage, ["line", "int"] as [string, string]];
    const arrays = cols.map((_, i) => batch.map((r) => r[i]));
    await tx.query(`INSERT INTO ${s} (${cols.map((c) => c[0]).join(", ")}) SELECT * FROM unnest(${cols.map(([, ty], i) => `$${i + 1}::${ty}[]`).join(", ")})`, arrays);
    rep.staged += batch.length;
    batch = [];
  };
  for await (const raw of readCsvRows(file)) {
    if (!header) {
      header = raw;
      hc = checkHeader(spec, raw);
      if (hc.missing.length) throw new HeaderError(`${path.basename(file)}: missing column(s) ${hc.missing.join(", ")}; header is "${raw.join(",")}"`);
      rep.extraColumns = hc.extra;
      continue;
    }
    line++;
    rep.rowsRead++;
    const typed = typeRow(spec, hc!, raw, header.length);
    if (!typed.ok) {
      reject(typed.reason, `line ${line}: ${raw.join(",").slice(0, 80)}`);
      continue;
    }
    const named: Record<string, Cell> = {};
    spec.columns.forEach((c, i) => (named[c.name] = typed.cells[i]));
    if (filter && plan.keep && !plan.keep(named, filter)) continue;
    batch.push([...plan.pick.map((n) => named[n]), line]);
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  if (!header) throw new HeaderError(`${path.basename(file)} is empty`);

  for (const check of plan.checks) {
    const bad = await tx.query<{ line: number; k: string }>(`SELECT s.line, concat_ws(',', ${plan.stage.map(([k]) => `s.${k}`).join(", ")}) AS k FROM ${s} s WHERE ${check.where} ORDER BY s.line`);
    if (!bad.rows.length) continue;
    for (const b of bad.rows) reject(check.reason, `line ${b.line}: ${b.k}`);
    await tx.query(`DELETE FROM ${s} WHERE line = ANY($1::int[])`, [bad.rows.map((b) => b.line)]);
  }

  const keyList = plan.key.join(", ");
  const total = (await tx.query<{ n: number; k: number }>(`SELECT count(*)::int AS n, count(DISTINCT (${keyList}))::int AS k FROM ${s}`)).rows[0];
  rep.duplicatesMerged = total.n - total.k;
  const dedup = plan.aggregate ?? `SELECT DISTINCT ON (${keyList}) * FROM ${s} ORDER BY ${keyList}, line DESC`;
  const sql = `WITH d AS (${dedup}), u AS (${plan.upsert(String(provId)).replace("$SOURCE", "$1")} RETURNING (xmax = 0) AS inserted) SELECT count(*) FILTER (WHERE inserted)::int AS ins, count(*) FILTER (WHERE NOT inserted)::int AS upd FROM u`;
  const res = (await tx.query<{ ins: number; upd: number }>(sql, sql.includes("$1") ? [sourceId] : [])).rows[0];
  rep.inserted = res.ins;
  rep.updated = res.upd;
  rep.unchanged = total.k - res.ins - res.upd;

  if (plan.inventoryChild && filter) {
    // Sync: lines of the imported inventories that the file no longer has are removed.
    const cond = plan.key.map((k) => `x.${k} = t.${k}`).join(" AND ");
    const del = await tx.query(
      `DELETE FROM ${t} t WHERE t.inventory_id = ANY($1::int[]) AND NOT EXISTS (SELECT 1 FROM ${s} x WHERE ${cond})`,
      [[...filter.inventoryIds]],
    );
    rep.deletedStale = del.affectedRows ?? 0;
  } else if (plan.inventoryChild) {
    const cond = plan.key.map((k) => `x.${k} = t.${k}`).join(" AND ");
    const del = await tx.query(`DELETE FROM ${t} t WHERE NOT EXISTS (SELECT 1 FROM ${s} x WHERE ${cond})`);
    rep.deletedStale = del.affectedRows ?? 0;
  }
  if (plan.staleSql) rep.staleInDb = (await tx.query<{ n: number }>(plan.staleSql)).rows[0].n;
  return rep;
}
