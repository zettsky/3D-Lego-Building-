/**
 * Part library (Phase 2).
 *
 * Every part is described on the shared grid: `w` studs along local X, `d` studs along
 * local Z, `h` plates tall (1 brick = 3 plates). That box is what collisions use.
 * Geometry is generated procedurally from real LEGO-compatible dimensions plus a `shape`
 * (see render/geometry.ts). No third-party meshes are bundled.
 *
 * Shapes are simplified where a part has fine detail (clips, hinges, plant leaves); the
 * footprint, height, stud positions and colour are always the real ones.
 *
 * `ldraw` is the LDraw part file used for import/export (src/engine/ldraw.ts).
 */

export type PartCategory = "brick" | "plate" | "tile" | "slope" | "panel" | "arch" | "round" | "snot" | "special";

/** "back-row": studs only on the local +Z row (slopes). "custom": see `studPoints`. */
export type StudLayout = "all" | "none" | "back-row" | "custom";

export type PartShape =
  | "box"
  | "slope" // 45° face toward −Z, flat back row
  | "slope-inv" // inverted 45°: the underside slopes toward −Z, top is flat
  | "cheese" // low wedge rising toward +Z
  | "curve" // quarter-round top toward −Z
  | "panel" // thin wall at +Z with floor and top rim
  | "arch" // 1-deep arch: one leg at local x = 0, curved underside
  | "round" // cylinder
  | "bracket" // plate with a vertical flange on its −Z edge
  | "ridge" // double 45° slope, ridge along local Z
  | "grass"; // decorative plant tuft

/** Side stud on a vertical face. `u` = position along the face (studs), `v` = height (plates) of the stud centre. */
export interface SideStud {
  face: "+x" | "-x" | "+z" | "-z";
  u: number;
  v: number;
}

export interface PartDef {
  id: string;
  ldraw: string;
  name: string;
  category: PartCategory;
  w: number;
  d: number;
  h: number;
  studs: StudLayout;
  shape: PartShape;
  /** Stud centres in local coordinates (from the min corner), for `studs: "custom"`. */
  studPoints?: [number, number][];
  sideStuds?: SideStud[];
  /** Printed decoration, rendered as a texture on the top face. */
  print?: string;
  /** Element id from the LEGO parts list (the number printed in the manual). */
  element?: string;
}

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  brick: "Standard Bricks",
  plate: "Plates",
  tile: "Tiles",
  slope: "Slopes",
  panel: "Panels",
  arch: "Arches",
  round: "Round Parts",
  snot: "Sideways Bricks",
  special: "Special Parts",
};

type Extra = Partial<Omit<PartDef, "id" | "name" | "category" | "w" | "d" | "h">>;

const def = (ldraw: string, name: string, category: PartCategory, w: number, d: number, h: number, extra: Extra = {}): PartDef => ({
  id: ldraw,
  ldraw: `${ldraw}.dat`,
  name,
  category,
  w,
  d,
  h,
  studs: "all",
  shape: "box",
  ...extra,
});

function fmtH(h: number): string {
  const whole = Math.floor(h / 3);
  const rest = h % 3;
  return rest === 0 ? `${whole}` : `${whole ? whole + " " : ""}${rest}/3`;
}

const brick = (ldraw: string, w: number, d: number, h = 3) =>
  def(ldraw, h === 3 ? `Brick ${Math.min(w, d)} × ${Math.max(w, d)}` : `Brick ${Math.min(w, d)} × ${Math.max(w, d)} × ${fmtH(h)}`, "brick", w, d, h);
const plate = (ldraw: string, w: number, d: number) => def(ldraw, `Plate ${Math.min(w, d)} × ${Math.max(w, d)}`, "plate", w, d, 1);
const tile = (ldraw: string, w: number, d: number) => def(ldraw, `Tile ${Math.min(w, d)} × ${Math.max(w, d)}`, "tile", w, d, 1, { studs: "none" });

export const PARTS: PartDef[] = [
  // ── bricks ──────────────────────────────────────────────────────────────
  brick("3005", 1, 1),
  brick("3004", 2, 1),
  brick("3622", 3, 1),
  brick("3010", 4, 1),
  brick("3009", 6, 1),
  brick("3008", 8, 1),
  brick("6111", 10, 1),
  brick("6112", 12, 1),
  brick("3003", 2, 2),
  brick("3002", 3, 2),
  brick("3001", 4, 2),
  brick("3245c", 2, 1, 6),
  brick("14716", 1, 1, 9),
  // ── plates ──────────────────────────────────────────────────────────────
  plate("3024", 1, 1),
  plate("3023", 2, 1),
  plate("3623", 3, 1),
  plate("3710", 4, 1),
  plate("3666", 6, 1),
  plate("3460", 8, 1),
  plate("4477", 10, 1),
  plate("60479", 12, 1),
  plate("3022", 2, 2),
  plate("3021", 3, 2),
  plate("3020", 4, 2),
  plate("3795", 6, 2),
  plate("3034", 8, 2),
  plate("3832", 10, 2),
  plate("2445", 12, 2),
  plate("4282", 16, 2),
  plate("3031", 4, 4),
  plate("3032", 6, 4),
  plate("3035", 8, 4),
  plate("3030", 10, 4),
  plate("3958", 6, 6),
  def("2420", "Plate 2 × 2 Corner", "plate", 2, 2, 1, { studs: "custom", studPoints: [[0.5, 0.5], [1.5, 0.5], [0.5, 1.5]] }),
  def("15573", "Plate 1 × 2 with 1 Stud (Jumper)", "plate", 2, 1, 1, { studs: "custom", studPoints: [[1, 0.5]], element: "6092565" }),
  def("15712", "Plate 1 × 1 with Clip", "plate", 1, 1, 1, { shape: "bracket", element: "6347310" }),
  // ── tiles ───────────────────────────────────────────────────────────────
  tile("3070b", 1, 1),
  tile("3069b", 2, 1),
  tile("63864", 3, 1),
  tile("2431", 4, 1),
  tile("6636", 6, 1),
  tile("4162", 8, 1),
  tile("3068b", 2, 2),
  tile("87079", 4, 2),
  tile("69729", 6, 2),
  def("69729p01", "Tile 2 × 6 with “SNOOPY” print", "tile", 6, 2, 1, { studs: "none", print: "SNOOPY", element: "6593124" }),
  def("98138", "Tile Round 1 × 1", "round", 1, 1, 1, { studs: "none", shape: "round" }),
  // ── slopes ──────────────────────────────────────────────────────────────
  def("3040", "Slope 45° 2 × 1", "slope", 1, 2, 3, { studs: "back-row", shape: "slope" }),
  def("3039", "Slope 45° 2 × 2", "slope", 2, 2, 3, { studs: "back-row", shape: "slope" }),
  def("3037", "Slope 45° 2 × 4", "slope", 4, 2, 3, { studs: "back-row", shape: "slope" }),
  def("3044", "Slope 45° 2 × 1 Double", "slope", 2, 1, 3, { studs: "none", shape: "ridge" }),
  def("3665", "Slope Inverted 45° 2 × 1", "slope", 1, 2, 3, { shape: "slope-inv" }),
  def("54200", "Slope 30° 1 × 1 × 2/3 (Cheese)", "slope", 1, 1, 2, { studs: "none", shape: "cheese", element: "4157124" }),
  def("85984", "Slope 30° 1 × 2 × 2/3", "slope", 1, 2, 2, { studs: "none", shape: "cheese" }),
  def("11477", "Slope Curved 2 × 1", "slope", 1, 2, 2, { studs: "none", shape: "curve" }),
  // ── panels & arches ─────────────────────────────────────────────────────
  def("23969", "Panel 1 × 2 × 3", "panel", 2, 1, 9, { shape: "panel", element: "6249891" }),
  def("60581", "Panel 1 × 4 × 3", "panel", 4, 1, 9, { shape: "panel", element: "4558212" }),
  def("59349", "Panel 1 × 6 × 5", "panel", 6, 1, 15, { shape: "panel", element: "6543965" }),
  def("13965", "Arch 1 × 3 × 3", "arch", 3, 1, 9, { shape: "arch", element: "6648007" }),
  // ── round ───────────────────────────────────────────────────────────────
  def("4073", "Plate Round 1 × 1", "round", 1, 1, 1, { shape: "round" }),
  def("4032", "Plate Round 2 × 2", "round", 2, 2, 1, { shape: "round" }),
  // ── sideways building (SNOT) ────────────────────────────────────────────
  def("87087", "Brick 1 × 1 with Stud on Side", "snot", 1, 1, 3, { sideStuds: [{ face: "-z", u: 0.5, v: 1.5 }] }),
  def("4733", "Brick 1 × 1 with Studs on 4 Sides", "snot", 1, 1, 3, {
    sideStuds: [
      { face: "-z", u: 0.5, v: 1.5 },
      { face: "+z", u: 0.5, v: 1.5 },
      { face: "-x", u: 0.5, v: 1.5 },
      { face: "+x", u: 0.5, v: 1.5 },
    ],
  }),
  def("32952", "Brick 1 × 1 × 1 2/3 with Studs on Side", "snot", 1, 1, 5, {
    sideStuds: [
      { face: "-z", u: 0.5, v: 1.5 },
      { face: "-z", u: 0.5, v: 4 },
    ],
    element: "6187620",
  }),
  def("11211", "Brick 1 × 2 with Studs on Side", "snot", 2, 1, 3, {
    sideStuds: [
      { face: "-z", u: 0.5, v: 1.5 },
      { face: "-z", u: 1.5, v: 1.5 },
    ],
  }),
  def("99780", "Bracket 1 × 2 – 1 × 2 Inverted", "snot", 2, 1, 1, { shape: "bracket" }),
  def("36840", "Bracket 1 × 1 – 1 × 1 Inverted", "snot", 1, 1, 1, { shape: "bracket", element: "6464976" }),
  // ── decorative ──────────────────────────────────────────────────────────
  def("grass", "Plant, Grass Tuft", "special", 1, 1, 4, { studs: "none", shape: "grass", ldraw: "15279.dat", element: "6616704" }),
];

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

/** Does local cell (lx, lz) carry a stud on top? (Grid layouts; custom layouts match exact cell centres.) */
export function hasStudAt(part: PartDef, lx: number, lz: number): boolean {
  if (part.studs === "all") return true;
  if (part.studs === "none") return false;
  if (part.studs === "custom") return (part.studPoints ?? []).some(([x, z]) => x === lx + 0.5 && z === lz + 0.5);
  return lz === part.d - 1;
}

/** Stud centres on top of a part, in local coordinates measured from its min corner. */
export function studPoints(part: PartDef): [number, number][] {
  if (part.studs === "custom") return part.studPoints ?? [];
  const out: [number, number][] = [];
  for (let lx = 0; lx < part.w; lx++) for (let lz = 0; lz < part.d; lz++) if (hasStudAt(part, lx, lz)) out.push([lx + 0.5, lz + 0.5]);
  return out;
}
