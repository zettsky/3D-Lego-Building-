/**
 * Part library.
 *
 * Every part is described on the shared grid: `w` studs along local X, `d` studs along
 * local Z, `h` plates tall (1 brick = 3 plates). Geometry is generated procedurally from
 * real LEGO-compatible dimensions (see units.ts) — no third-party meshes are bundled.
 *
 * `ldraw` is the LDraw part file used for import/export (src/engine/ldraw.ts).
 */

export type PartCategory = "brick" | "plate" | "tile" | "slope";

export type StudLayout = "all" | "none" | "back-row";

export interface PartDef {
  id: string;
  ldraw: string;
  name: string;
  category: PartCategory;
  w: number;
  d: number;
  h: number;
  studs: StudLayout;
}

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  brick: "Standard Bricks",
  plate: "Plates",
  tile: "Tiles",
  slope: "Slopes",
};

const brick = (ldraw: string, w: number, d: number): PartDef => ({
  id: ldraw,
  ldraw: `${ldraw}.dat`,
  name: `Brick ${d} × ${w}`,
  category: "brick",
  w,
  d,
  h: 3,
  studs: "all",
});

const plate = (ldraw: string, w: number, d: number): PartDef => ({
  id: ldraw,
  ldraw: `${ldraw}.dat`,
  name: `Plate ${d} × ${w}`,
  category: "plate",
  w,
  d,
  h: 1,
  studs: "all",
});

const tile = (ldraw: string, w: number, d: number): PartDef => ({
  id: ldraw,
  ldraw: `${ldraw}.dat`,
  name: `Tile ${d} × ${w}`,
  category: "tile",
  w,
  d,
  h: 1,
  studs: "none",
});

/** 45° slopes: high side (with one stud row) at local +Z, slope face toward local −Z. */
const slope = (ldraw: string, w: number): PartDef => ({
  id: ldraw,
  ldraw: `${ldraw}.dat`,
  name: `Slope 45° 2 × ${w}`,
  category: "slope",
  w,
  d: 2,
  h: 3,
  studs: "back-row",
});

export const PARTS: PartDef[] = [
  brick("3005", 1, 1),
  brick("3004", 2, 1),
  brick("3622", 3, 1),
  brick("3010", 4, 1),
  brick("3009", 6, 1),
  brick("3003", 2, 2),
  brick("3002", 3, 2),
  brick("3001", 4, 2),
  plate("3024", 1, 1),
  plate("3023", 2, 1),
  plate("3710", 4, 1),
  plate("3022", 2, 2),
  plate("3020", 4, 2),
  plate("3795", 6, 2),
  plate("3031", 4, 4),
  plate("3958", 6, 6),
  tile("3070b", 1, 1),
  tile("3069b", 2, 1),
  tile("3068b", 2, 2),
  slope("3040", 1),
  slope("3039", 2),
  slope("3037", 4),
];

// Brick names read better as "Brick 1 × 2" (rows × studs) — normalise d ≤ w ordering.
for (const p of PARTS) {
  const a = Math.min(p.w, p.d);
  const b = Math.max(p.w, p.d);
  if (p.category === "slope") continue;
  p.name = `${p.name.split(" ")[0]} ${a} × ${b}`;
}

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));
const BY_LDRAW = new Map(PARTS.map((p) => [p.ldraw.toLowerCase(), p]));

export function getPart(id: string): PartDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown part "${id}"`);
  return p;
}

export function findPartByLdraw(file: string): PartDef | undefined {
  const f = file.toLowerCase().replace(/\\/g, "/").split("/").pop()!;
  return BY_LDRAW.get(f) ?? BY_LDRAW.get(f.replace(/b?\.dat$/, "b.dat")) ?? BY_LDRAW.get(f.replace(/b\.dat$/, ".dat"));
}

/** Does local cell (lx, lz) carry a stud on top? */
export function hasStudAt(part: PartDef, lx: number, lz: number): boolean {
  if (part.studs === "all") return true;
  if (part.studs === "none") return false;
  return lz === part.d - 1;
}
