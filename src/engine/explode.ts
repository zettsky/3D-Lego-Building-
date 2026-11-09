/**
 * Exploded View separation vectors (scene units at 100 %).
 *
 * Bricks are not thrown in random directions. For each brick introduced in a step:
 *  1. The assembly direction for stud connections is +Y (the brick was pressed down).
 *  2. Bricks stacked *within* the step are lifted proportionally to their layer, so a brick
 *     never passes through another brick of the same step.
 *  3. A small lateral spread away from the step's centre keeps neighbours readable.
 *  4. If something already placed sits directly above the brick (an overhang), lifting would
 *     collide, so the brick slides out sideways toward the nearest open side instead.
 * The same vectors drive the placement animation, so "how it explodes" and "how it goes on"
 * always match.
 */
import { cellsOf, topOf, type BrickInstance } from "./assembly";
import { getPart } from "./parts";
import { PLATE, type Vec3 } from "./units";

export function explodeVectors(previous: BrickInstance[], stepBricks: BrickInstance[]): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  if (!stepBricks.length) return out;

  const layers = [...new Set(stepBricks.map((b) => b.y))].sort((a, b) => a - b);
  const maxH = Math.max(...stepBricks.map((b) => getPart(b.partId).h)) * PLATE;
  const layerGap = maxH + 0.9;

  let cx = 0;
  let cz = 0;
  const centers = new Map<string, [number, number]>();
  for (const b of stepBricks) {
    const cells = cellsOf(b);
    const x = cells.reduce((s, c) => s + c.x + 0.5, 0) / cells.length;
    const z = cells.reduce((s, c) => s + c.z + 0.5, 0) / cells.length;
    centers.set(b.uid, [x, z]);
    cx += x;
    cz += z;
  }
  cx /= stepBricks.length;
  cz /= stepBricks.length;

  // Columns covered by already-placed bricks, with their lowest bottom, to detect overhangs.
  const prevAbove = new Map<string, number[]>();
  for (const p of previous) for (const c of cellsOf(p)) {
    const k = `${c.x},${c.z}`;
    const arr = prevAbove.get(k) ?? [];
    arr.push(p.y);
    prevAbove.set(k, arr);
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of [...previous, ...stepBricks]) for (const c of cellsOf(p)) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x + 1);
    minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z + 1);
  }

  for (const b of stepBricks) {
    const [x, z] = centers.get(b.uid)!;
    const top = topOf(b);
    const blocked = cellsOf(b).some((c) => (prevAbove.get(`${c.x},${c.z}`) ?? []).some((y) => y >= top));
    if (blocked) {
      // Conservative fallback: slide out along the axis with the shortest exit.
      const exits: [number, Vec3][] = [
        [x - minX, [-(x - minX + 1.5), 0, 0]],
        [maxX - x, [maxX - x + 1.5, 0, 0]],
        [z - minZ, [0, 0, -(z - minZ + 1.5)]],
        [maxZ - z, [0, 0, maxZ - z + 1.5]],
      ];
      exits.sort((a, b) => a[0] - b[0]);
      out.set(b.uid, exits[0][1]);
      continue;
    }
    const layer = layers.indexOf(b.y);
    let dx = x - cx;
    let dz = z - cz;
    const len = Math.hypot(dx, dz);
    const spread = stepBricks.length > 1 ? 0.55 : 0;
    if (len > 1e-6) {
      dx = (dx / len) * spread * Math.min(1, len / 2);
      dz = (dz / len) * spread * Math.min(1, len / 2);
    } else {
      dx = 0;
      dz = 0;
    }
    out.set(b.uid, [dx, 1.6 + layer * layerGap, dz]);
  }
  return out;
}
