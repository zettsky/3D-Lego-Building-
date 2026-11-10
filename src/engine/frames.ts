/**
 * Sub-assemblies ("frames").
 *
 * Real sets build parts of the model separately (a wall built lying down, a roof panel,
 * a sign mounted sideways) and then attach them. A frame is a rigid group with its own
 * grid: bricks inside it use ordinary integer grid coordinates, and the frame's transform
 * places that grid inside its parent (another frame or the main model).
 *
 *  - `position` is in parent scene units (1 = one stud = 8 mm), `rotation` is an XYZ Euler
 *    angle in radians. Together they map the frame's grid origin into the parent.
 *  - Until `attachStep`, the frame is shown at `staging` (beside the model, like the manual's
 *    sub-build boxes). On `attachStep` it glides to its final place.
 *
 * Collisions and connectivity are checked inside each frame's own grid. How a frame is held
 * to its parent (side studs, clips, hinges) is declared by the instruction author through
 * `anchor` bricks and the attach step; it is not simulated.
 */
import * as THREE from "three";
import { brickTransform, footprint, type Box3, type BrickInstance } from "./assembly";
import { getPart } from "./parts";
import { posedBox } from "./ldraw/library";
import { PLATE, type Vec3 } from "./units";

export interface FrameTransform {
  position: Vec3;
  rotation: Vec3;
}

export interface FrameDef extends FrameTransform {
  id: string;
  label: string;
  /** Parent frame id; omitted = the main model. */
  parent?: string;
  /** Where the frame is shown while it is being built (relative to its parent). Defaults to the final transform. */
  staging?: FrameTransform;
  /** Step index at which the frame is attached. Before it, `staging` applies. */
  attachStep?: number;
}

export const IDENTITY: FrameTransform = { position: [0, 0, 0], rotation: [0, 0, 0] };

export function frameMap(frames: FrameDef[] | undefined): Map<string, FrameDef> {
  return new Map((frames ?? []).map((f) => [f.id, f]));
}

/** Transform of a frame relative to its parent at a given step. */
export function frameLocalAt(f: FrameDef, step: number): FrameTransform {
  if (f.attachStep !== undefined && step < f.attachStep && f.staging) return f.staging;
  return f;
}

export function toMatrix(t: FrameTransform): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.rotation[0], t.rotation[1], t.rotation[2], "XYZ"));
  return new THREE.Matrix4().compose(new THREE.Vector3(...t.position), q, new THREE.Vector3(1, 1, 1));
}

/** World matrix of a frame (main-model space) at a given step. `step = Infinity` = finished model. */
export function frameWorldMatrix(frames: Map<string, FrameDef>, id: string | undefined, step: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const seen = new Set<string>();
  let cur = id ? frames.get(id) : undefined;
  while (cur) {
    if (seen.has(cur.id)) throw new Error(`Frame cycle at "${cur.id}"`);
    seen.add(cur.id);
    m.premultiply(toMatrix(frameLocalAt(cur, step)));
    cur = cur.parent ? frames.get(cur.parent) : undefined;
  }
  return m;
}

/** World-space corners of a brick's bounding box. */
function brickCorners(b: BrickInstance): THREE.Vector3[] {
  if (b.pose) {
    // LDraw-posed part: corners of its oriented body box, LDraw space (LDU, −y up) → scene units.
    const { c, axes, half } = posedBox(b.partId, b.pose, 0);
    const out: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const p = c.clone().addScaledVector(axes[0], sx * half[0]).addScaledVector(axes[1], sy * half[1]).addScaledVector(axes[2], sz * half[2]);
      out.push(new THREE.Vector3(p.x / 20, -p.y / 20, p.z / 20));
    }
    return out;
  }
  const part = getPart(b.partId);
  const { fw, fd } = footprint(part, b.rot);
  const y0 = b.y * PLATE;
  const y1 = (b.y + part.h) * PLATE;
  const out: THREE.Vector3[] = [];
  for (const x of [b.x, b.x + fw]) for (const y of [y0, y1]) for (const z of [b.z, b.z + fd]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

/** Axis-aligned world bounds of bricks, honouring frames at `step`. */
export function worldBounds(bricks: BrickInstance[], frames: Map<string, FrameDef>, step = Infinity): Box3 {
  if (!bricks.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  const box = new THREE.Box3();
  const cache = new Map<string, THREE.Matrix4>();
  for (const b of bricks) {
    const k = b.frame ?? "";
    let m = cache.get(k);
    if (!m) cache.set(k, (m = frameWorldMatrix(frames, b.frame, step)));
    for (const c of brickCorners(b)) box.expandByPoint(c.applyMatrix4(m));
  }
  return { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
}

export interface Placement {
  brick: BrickInstance;
  matrix: THREE.Matrix4;
}

/** World matrix for each brick (geometry is centred in x/z with its bottom at y = 0). */
export function placements(bricks: BrickInstance[], frames: Map<string, FrameDef>, step = Infinity): Placement[] {
  const cache = new Map<string, THREE.Matrix4>();
  return bricks.map((b) => {
    const k = b.frame ?? "";
    let fm = cache.get(k);
    if (!fm) cache.set(k, (fm = frameWorldMatrix(frames, b.frame, step)));
    const t = brickTransform(b);
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...t.position),
      t.quaternion ? new THREE.Quaternion(...t.quaternion) : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotationY),
      new THREE.Vector3(1, 1, 1),
    );
    return { brick: b, matrix: fm.clone().multiply(local) };
  });
}

/** Ancestors-first ordering, for building nested scene groups. */
export function frameOrder(frames: FrameDef[]): FrameDef[] {
  const map = frameMap(frames);
  const out: FrameDef[] = [];
  const done = new Set<string>();
  const visit = (f: FrameDef, trail: Set<string>) => {
    if (done.has(f.id)) return;
    if (trail.has(f.id)) throw new Error(`Frame cycle at "${f.id}"`);
    trail.add(f.id);
    if (f.parent) {
      const p = map.get(f.parent);
      if (!p) throw new Error(`Frame "${f.id}" has unknown parent "${f.parent}"`);
      visit(p, trail);
    }
    done.add(f.id);
    out.push(f);
  };
  for (const f of frames) visit(f, new Set());
  return out;
}
