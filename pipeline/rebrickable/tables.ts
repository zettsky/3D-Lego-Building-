/**
 * Expected layout of Rebrickable's bulk CSV downloads (https://cdn.rebrickable.com/media/downloads/<table>.csv.gz),
 * checked against the live files on 2026-11-10. If Rebrickable changes a header the import stops with a clear
 * error instead of loading shifted columns.
 */
export type ColType = "int" | "int?" | "text" | "text?" | "bool" | "rgb";

export interface ColumnSpec {
  name: string;
  type: ColType;
}

export interface TableSpec {
  table: string;
  columns: ColumnSpec[];
}

export const REBRICKABLE_TABLES = {
  themes: { table: "themes", columns: [c("id", "int"), c("name", "text"), c("parent_id", "int?")] },
  colors: {
    table: "colors",
    columns: [c("id", "int"), c("name", "text"), c("rgb", "rgb"), c("is_trans", "bool"), c("num_parts", "int?"), c("num_sets", "int?"), c("y1", "int?"), c("y2", "int?")],
  },
  part_categories: { table: "part_categories", columns: [c("id", "int"), c("name", "text")] },
  parts: { table: "parts", columns: [c("part_num", "text"), c("name", "text"), c("part_cat_id", "int"), c("part_material", "text?")] },
  part_relationships: { table: "part_relationships", columns: [c("rel_type", "text"), c("child_part_num", "text"), c("parent_part_num", "text")] },
  elements: { table: "elements", columns: [c("element_id", "text"), c("part_num", "text"), c("color_id", "int"), c("design_id", "text?")] },
  sets: { table: "sets", columns: [c("set_num", "text"), c("name", "text"), c("year", "int"), c("theme_id", "int"), c("num_parts", "int"), c("img_url", "text?")] },
  minifigs: { table: "minifigs", columns: [c("fig_num", "text"), c("name", "text"), c("num_parts", "int"), c("img_url", "text?")] },
  inventories: { table: "inventories", columns: [c("id", "int"), c("version", "int"), c("set_num", "text")] },
  inventory_parts: {
    table: "inventory_parts",
    columns: [c("inventory_id", "int"), c("part_num", "text"), c("color_id", "int"), c("quantity", "int"), c("is_spare", "bool"), c("img_url", "text?")],
  },
  inventory_minifigs: { table: "inventory_minifigs", columns: [c("inventory_id", "int"), c("fig_num", "text"), c("quantity", "int")] },
  inventory_sets: { table: "inventory_sets", columns: [c("inventory_id", "int"), c("set_num", "text"), c("quantity", "int")] },
} satisfies Record<string, TableSpec>;

export type RebrickableTable = keyof typeof REBRICKABLE_TABLES;

/** Import order respects foreign keys. */
export const IMPORT_ORDER: RebrickableTable[] = [
  "themes",
  "colors",
  "part_categories",
  "parts",
  "part_relationships",
  "elements",
  "sets",
  "minifigs",
  "inventories",
  "inventory_sets",
  "inventory_minifigs",
  "inventory_parts",
];

function c(name: string, type: ColType): ColumnSpec {
  return { name, type };
}

export type Cell = string | number | boolean | null;

export interface HeaderCheck {
  index: number[]; // position of each expected column in the file
  extra: string[];
  missing: string[];
}

export function checkHeader(spec: TableSpec, header: string[]): HeaderCheck {
  const h = header.map((x, i) => (i === 0 ? x.replace(/^﻿/, "") : x).trim());
  const index = spec.columns.map((col) => h.indexOf(col.name));
  return {
    index,
    missing: spec.columns.filter((_, i) => index[i] < 0).map((col) => col.name),
    extra: h.filter((name) => !spec.columns.some((col) => col.name === name)),
  };
}

/** Converts one raw row into typed cells, or returns the reason it is rejected. */
export function typeRow(spec: TableSpec, hc: HeaderCheck, raw: string[], headerLength: number): { ok: true; cells: Cell[] } | { ok: false; reason: string } {
  if (raw.length !== headerLength) return { ok: false, reason: `expected ${headerLength} fields, got ${raw.length}` };
  const cells: Cell[] = [];
  for (let i = 0; i < spec.columns.length; i++) {
    const col = spec.columns[i];
    const v = raw[hc.index[i]];
    const r = convert(col.type, v);
    if (r === INVALID) return { ok: false, reason: `${col.name}: invalid ${col.type} "${v.slice(0, 40)}"` };
    cells.push(r);
  }
  return { ok: true, cells };
}

const INVALID = Symbol("invalid");

function convert(type: ColType, v: string): Cell | typeof INVALID {
  switch (type) {
    case "int":
      return /^-?\d+$/.test(v) ? Number(v) : INVALID;
    case "int?":
      return v === "" ? null : /^-?\d+$/.test(v) ? Number(v) : INVALID;
    case "text":
      return v.trim() === "" ? INVALID : v;
    case "text?":
      return v === "" ? null : v;
    case "bool":
      return v === "True" || v === "t" || v === "true" ? true : v === "False" || v === "f" || v === "false" ? false : INVALID;
    case "rgb":
      return /^[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : INVALID;
  }
}
