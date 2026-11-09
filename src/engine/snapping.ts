/**
 * LEGO-aware snapping: given the cell under the pointer, a part and a rotation, find where
 * the brick would land and whether that placement is valid. Used by the Custom Build ghost
 * preview *and* by the reducer that commits placements, so preview and result never differ.
 */
import {
  buildOccupancy,
  buildStudMap,
  cellsOf,
  collidesWith,
  connectionsBelow,
  footprint,
  studCellsOf,
  topOf,
  type BrickInstance,
  type Bounds2D,
  type Cell,
  type Rot,
} from "./assembly";
import { getPart } from "./parts";

export const MAX_HEIGHT_PLATES = 120;

export interface Candidate {
  brick: BrickInstance;
  valid: boolean;
  reason?: string;
  /** uids of bricks this candidate would clutch */
  connectsTo: string[];
}

/** Highest occupied plate level per column (top surface). */
export function columnTops(bricks: BrickInstance[]): Map<string, number> {
  const tops = new Map<string, number>();
  for (const b of bricks) {
    const t = topOf(b);
    for (const c of cellsOf(b)) {
      const k = `${c.x},${c.z}`;
      if ((tops.get(k) ?? 0) < t) tops.set(k, t);
    }
  }
  return tops;
}

export function anchorToOrigin(anchor: Cell, partId: string, rot: Rot): Cell {
  const { fw, fd } = footprint(getPart(partId), rot);
  return { x: anchor.x - Math.floor((fw - 1) / 2), z: anchor.z - Math.floor((fd - 1) / 2) };
}

export function clampToBounds(origin: Cell, partId: string, rot: Rot, bounds: Bounds2D): Cell {
  const { fw, fd } = footprint(getPart(partId), rot);
  return {
    x: Math.min(Math.max(origin.x, bounds.minX), bounds.maxX - fw),
    z: Math.min(Math.max(origin.z, bounds.minZ), bounds.maxZ - fd),
  };
}

/** Check a fully specified brick against the assembly (collision, support, bounds). */
export function checkPlacement(bricks: BrickInstance[], brick: BrickInstance, bounds: Bounds2D, ignoreUid?: string): Candidate {
  const others = ignoreUid ? bricks.filter((b) => b.uid !== ignoreUid) : bricks;
  const part = getPart(brick.partId);
  for (const c of cellsOf(brick))
    if (c.x < bounds.minX || c.z < bounds.minZ || c.x >= bounds.maxX || c.z >= bounds.maxZ)
      return { brick, valid: false, reason: "That would hang off the build plate.", connectsTo: [] };
  if (brick.y < 0) return { brick, valid: false, reason: "Below the build plate.", connectsTo: [] };
  if (brick.y + part.h > MAX_HEIGHT_PLATES) return { brick, valid: false, reason: "That is as tall as the studio goes.", connectsTo: [] };
  const occ = buildOccupancy(others);
  const hit = collidesWith(brick, occ);
  if (hit) return { brick, valid: false, reason: "Another brick is in the way.", connectsTo: [] };
  const studs = buildStudMap(others);
  const below = connectionsBelow(brick, studs);
  // Bricks resting on this one's studs also count as a connection (e.g. after rotating).
  const above: string[] = [];
  const top = brick.y + part.h;
  const myStuds = new Set(studCellsOf(brick).map((c) => `${c.x},${c.z}`));
  for (const o of others)
    if (o.y === top && cellsOf(o).some((c) => myStuds.has(`${c.x},${c.z}`))) above.push(o.uid);
  const connectsTo = [...below, ...above];
  if (brick.y > 0 && connectsTo.length === 0)
    return { brick, valid: false, reason: "Nothing to snap onto — tiles and slope faces have no studs.", connectsTo };
  return { brick, valid: true, connectsTo };
}

/** Drop a part onto the column(s) under the anchor cell, like setting a brick down. */
export function snapCandidate(
  bricks: BrickInstance[],
  partId: string,
  colorId: string,
  rot: Rot,
  anchor: Cell,
  bounds: Bounds2D,
  opts: { uid?: string; ignoreUid?: string } = {},
): Candidate {
  const origin = clampToBounds(anchorToOrigin(anchor, partId, rot), partId, rot, bounds);
  const others = opts.ignoreUid ? bricks.filter((b) => b.uid !== opts.ignoreUid) : bricks;
  const tops = columnTops(others);
  const probe: BrickInstance = { uid: opts.uid ?? "candidate", partId, colorId, x: origin.x, y: 0, z: origin.z, rot };
  let y = 0;
  for (const c of cellsOf(probe)) y = Math.max(y, tops.get(`${c.x},${c.z}`) ?? 0);
  return checkPlacement(others, { ...probe, y }, bounds);
}
