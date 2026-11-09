/**
 * Assembly system — the authoritative, serialisable description of placed bricks.
 *
 * Three.js objects are *views* of this data, never the source of truth.
 */
import { getPart, hasStudAt, type PartDef } from "./parts";
import { PLATE, type Vec3 } from "./units";

export type Rot = 0 | 1 | 2 | 3; // quarter turns about +Y

export interface BrickInstance {
  uid: string;
  partId: string;
  colorId: string;
  x: number;
  y: number;
  z: number;
  rot: Rot;
  /** Optional sub-assembly id (reserved for Phase 2 sub-assemblies). */
  group?: string;
}

export interface Cell {
  x: number;
  z: number;
}

let uidCounter = 0;
export function newUid(prefix = "b"): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Footprint size in world studs after rotation. */
export function footprint(part: PartDef, rot: Rot): { fw: number; fd: number } {
  return rot % 2 === 0 ? { fw: part.w, fd: part.d } : { fw: part.d, fd: part.w };
}

const COS = [1, 0, -1, 0];
const SIN = [0, 1, 0, -1];

/**
 * Map a local cell of a part to a world cell. Uses exactly the same rotation as the
 * renderer (Three.js rotation.y = rot·90°), so collision and visuals always agree.
 */
export function localToWorldCell(part: PartDef, b: Pick<BrickInstance, "x" | "z" | "rot">, lx: number, lz: number): Cell {
  const { fw, fd } = footprint(part, b.rot);
  const ox = lx + 0.5 - part.w / 2;
  const oz = lz + 0.5 - part.d / 2;
  const c = COS[b.rot];
  const s = SIN[b.rot];
  const wx = ox * c + oz * s;
  const wz = -ox * s + oz * c;
  return { x: Math.floor(b.x + fw / 2 + wx), z: Math.floor(b.z + fd / 2 + wz) };
}

export function cellsOf(b: BrickInstance): Cell[] {
  const part = getPart(b.partId);
  const out: Cell[] = [];
  for (let lx = 0; lx < part.w; lx++) for (let lz = 0; lz < part.d; lz++) out.push(localToWorldCell(part, b, lx, lz));
  return out;
}

export function studCellsOf(b: BrickInstance): Cell[] {
  const part = getPart(b.partId);
  const out: Cell[] = [];
  for (let lx = 0; lx < part.w; lx++)
    for (let lz = 0; lz < part.d; lz++) if (hasStudAt(part, lx, lz)) out.push(localToWorldCell(part, b, lx, lz));
  return out;
}

export function topOf(b: BrickInstance): number {
  return b.y + getPart(b.partId).h;
}

const key3 = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Voxel occupancy: one voxel = 1 stud × 1 stud × 1 plate. Conservative for slopes. */
export function buildOccupancy(bricks: BrickInstance[]): Map<string, string> {
  const occ = new Map<string, string>();
  for (const b of bricks) {
    const h = getPart(b.partId).h;
    for (const c of cellsOf(b)) for (let y = b.y; y < b.y + h; y++) occ.set(key3(c.x, y, c.z), b.uid);
  }
  return occ;
}

export function collidesWith(b: BrickInstance, occ: Map<string, string>, ignoreUid?: string): string | null {
  const h = getPart(b.partId).h;
  for (const c of cellsOf(b))
    for (let y = b.y; y < b.y + h; y++) {
      const hit = occ.get(key3(c.x, y, c.z));
      if (hit && hit !== b.uid && hit !== ignoreUid) return hit;
    }
  return null;
}

/** Stud map: key (x, studBaseY, z) → uid of the brick that owns the stud. */
export function buildStudMap(bricks: BrickInstance[]): Map<string, string> {
  const studs = new Map<string, string>();
  for (const b of bricks) {
    const top = topOf(b);
    for (const c of studCellsOf(b)) studs.set(key3(c.x, top, c.z), b.uid);
  }
  return studs;
}

/** Bricks this brick clutches from above (it sits on their studs). */
export function connectionsBelow(b: BrickInstance, studs: Map<string, string>): string[] {
  const out = new Set<string>();
  for (const c of cellsOf(b)) {
    const u = studs.get(key3(c.x, b.y, c.z));
    if (u && u !== b.uid) out.add(u);
  }
  return [...out];
}

export interface ConnectionGraph {
  /** undirected adjacency */
  adj: Map<string, Set<string>>;
  grounded: Set<string>;
}

/** Ground = the build mat at y = 0 (studded baseplate in Custom Build, table in Guided Build). */
export function buildConnectionGraph(bricks: BrickInstance[]): ConnectionGraph {
  const studs = buildStudMap(bricks);
  const adj = new Map<string, Set<string>>();
  for (const b of bricks) adj.set(b.uid, new Set());
  for (const b of bricks)
    for (const u of connectionsBelow(b, studs)) {
      adj.get(b.uid)!.add(u);
      adj.get(u)?.add(b.uid);
    }
  const grounded = new Set<string>();
  const queue = bricks.filter((b) => b.y === 0).map((b) => b.uid);
  for (const u of queue) grounded.add(u);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? [])
      if (!grounded.has(v)) {
        grounded.add(v);
        queue.push(v);
      }
  }
  return { adj, grounded };
}

export interface AssemblyIssue {
  kind: "collision" | "floating" | "out-of-bounds" | "duplicate-uid" | "below-ground";
  uid: string;
  other?: string;
  message: string;
}

export interface Bounds2D {
  minX: number;
  minZ: number;
  maxX: number; // exclusive
  maxZ: number; // exclusive
}

/** Deterministic geometric validation used by tests, the importer and the studio. */
export function validateAssembly(bricks: BrickInstance[], bounds?: Bounds2D): AssemblyIssue[] {
  const issues: AssemblyIssue[] = [];
  const seen = new Set<string>();
  const occ = new Map<string, string>();
  for (const b of bricks) {
    if (seen.has(b.uid)) issues.push({ kind: "duplicate-uid", uid: b.uid, message: `Duplicate id ${b.uid}` });
    seen.add(b.uid);
    if (b.y < 0) issues.push({ kind: "below-ground", uid: b.uid, message: `${b.uid} is below the build mat` });
    const hit = collidesWith(b, occ);
    if (hit) issues.push({ kind: "collision", uid: b.uid, other: hit, message: `${b.uid} intersects ${hit}` });
    const h = getPart(b.partId).h;
    for (const c of cellsOf(b)) {
      if (bounds && (c.x < bounds.minX || c.z < bounds.minZ || c.x >= bounds.maxX || c.z >= bounds.maxZ))
        issues.push({ kind: "out-of-bounds", uid: b.uid, message: `${b.uid} hangs off the build mat` });
      for (let y = b.y; y < b.y + h; y++) occ.set(key3(c.x, y, c.z), b.uid);
    }
  }
  const { grounded } = buildConnectionGraph(bricks);
  for (const b of bricks)
    if (!grounded.has(b.uid))
      issues.push({ kind: "floating", uid: b.uid, message: `${b.uid} is not connected to anything` });
  return issues;
}

/** Scene transform for a brick: geometry is centred in x/z with its bottom at y = 0. */
export function brickTransform(b: BrickInstance): { position: Vec3; rotationY: number } {
  const part = getPart(b.partId);
  const { fw, fd } = footprint(part, b.rot);
  return { position: [b.x + fw / 2, b.y * PLATE, b.z + fd / 2], rotationY: (b.rot * Math.PI) / 2 };
}

export interface Box3 {
  min: Vec3;
  max: Vec3;
}

export function sceneBounds(bricks: BrickInstance[]): Box3 {
  if (!bricks.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of bricks) {
    const part = getPart(b.partId);
    const { fw, fd } = footprint(part, b.rot);
    min[0] = Math.min(min[0], b.x);
    min[1] = Math.min(min[1], b.y * PLATE);
    min[2] = Math.min(min[2], b.z);
    max[0] = Math.max(max[0], b.x + fw);
    max[1] = Math.max(max[1], (b.y + part.h) * PLATE);
    max[2] = Math.max(max[2], b.z + fd);
  }
  return { min, max };
}

export function boundsCenter(b: Box3): Vec3 {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
}

export function boundsRadius(b: Box3): number {
  const dx = b.max[0] - b.min[0];
  const dy = b.max[1] - b.min[1];
  const dz = b.max[2] - b.min[2];
  return Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);
}
