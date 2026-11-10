/**
 * Small authoring kit for transcribing a manual into posed parts.
 *
 * Positions are read off the pictures in stud and plate counts, so `put` takes a grid
 * position — the min corner of the part's footprint box (x, z in studs) and its bottom (y in
 * plates, may be fractional) — plus an orientation, and converts that into an exact LDraw
 * pose using the part's real geometry bounds. Orientation is given as where the part's own
 * axes point in scene space (x right, y up = the way its studs face, z toward the back).
 */
import * as THREE from "three";
import type { BrickInstance } from "@/engine/assembly";
import type { Join } from "@/engine/connect";
import type { FrameDef } from "@/engine/frames";
import type { InstructionStep } from "@/engine/instructions";
import { ldFootprint, type LdPose } from "@/engine/ldraw/library";
import type { Vec3 } from "@/engine/units";

export type M3 = [number, number, number, number, number, number, number, number, number];

/** Scene-space rotation from where the part's x, y (studs) and z axes should point. */
export function orient(x: Vec3, y: Vec3, z?: Vec3): M3 {
  const X = new THREE.Vector3(...x);
  const Y = new THREE.Vector3(...y);
  const Z = z ? new THREE.Vector3(...z) : new THREE.Vector3().crossVectors(X, Y);
  return [X.x, Y.x, Z.x, X.y, Y.y, Z.y, X.z, Y.z, Z.z];
}

/** Quarter turns about the vertical, same sense as the engine's `rot`. */
export function yaw(n: number): M3 {
  const t = (n * Math.PI) / 2;
  const c = Math.round(Math.cos(t) * 1e9) / 1e9;
  const s = Math.round(Math.sin(t) * 1e9) / 1e9;
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

export const mulM = (A: M3, B: M3): M3 => {
  const o = new Array(9).fill(0) as M3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
  return o;
};

/** Arbitrary rotation about a scene axis (degrees). */
export function turn(axis: Vec3, deg: number): M3 {
  const m = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...axis).normalize(), (deg * Math.PI) / 180).elements;
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

export const UP: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/** Studs facing the front (−z) / back (+z) / left (−x) / right (+x) / down. */
export const FRONT = orient([1, 0, 0], [0, 0, -1]);
export const BACK = orient([-1, 0, 0], [0, 0, 1]);
export const LEFT = orient([0, 0, 1], [-1, 0, 0]);
export const RIGHT = orient([0, 0, -1], [1, 0, 0]);
export const DOWN = orient([1, 0, 0], [0, -1, 0]);

const toLd = (R: M3): M3 => [R[0], -R[1], R[2], -R[3], R[4], -R[5], R[6], -R[7], R[8]];

export interface Kit {
  put(part: string, color: string, at: Vec3, R?: M3, o?: { anchor?: boolean; frame?: string }): BrickInstance;
  /** Exact LDraw placement (position in LDU, scene-space rotation). */
  raw(part: string, color: string, ldu: Vec3, R?: M3, o?: { anchor?: boolean; frame?: string }): BrickInstance;
  step(manualStep: number, page: number, bricks: BrickInstance[], note?: string): void;
  join(a: BrickInstance, b: BrickInstance, kind: Join["kind"]): void;
  frame(f: FrameDef): void;
  steps: InstructionStep[];
  frames: FrameDef[];
  joins: Join[];
  /** Frame used by `put` when none is given. */
  use(frame: string | undefined): void;
}

export function kit(prefix: string): Kit {
  let n = 0;
  let current: string | undefined;
  const steps: InstructionStep[] = [];
  const frames: FrameDef[] = [];
  const joins: Join[] = [];
  const mk = (part: string, color: string, pose: LdPose, o: { anchor?: boolean; frame?: string } = {}): BrickInstance => {
    const b: BrickInstance = { uid: `${prefix}-${(++n).toString(36)}`, partId: part, colorId: color, x: 0, y: 0, z: 0, rot: 0, pose };
    const fr = o.frame ?? current;
    if (fr) b.frame = fr;
    if (o.anchor) b.anchor = true;
    return b;
  };
  return {
    steps,
    frames,
    joins,
    use(f) {
      current = f;
    },
    put(part, color, at, R = UP, o = {}) {
      const f = ldFootprint(part);
      // footprint corners in the part's scene space (scene y = −LDU y / 20)
      let min = [Infinity, Infinity, Infinity];
      for (const x of [f.x0, f.x1]) for (const y of [f.top, f.bottom]) for (const z of [f.z0, f.z1]) {
        const v = [x / 20, -y / 20, z / 20];
        const r = [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
        min = min.map((m, k) => Math.min(m, r[k]));
      }
      const p = [at[0] - min[0], at[1] * 0.4 - min[1], at[2] - min[2]];
      const L = toLd(R);
      const pose = [p[0] * 20, -p[1] * 20, p[2] * 20, ...L].map((v) => Math.round(v * 1000) / 1000) as LdPose;
      return mk(part, color, pose, o);
    },
    raw(part, color, ldu, R = UP, o = {}) {
      return mk(part, color, [...ldu, ...toLd(R)] as LdPose, o);
    },
    step(manualStep, page, bricks, note) {
      const s: InstructionStep = { manualStep, page, bricks };
      if (note) s.note = note;
      steps.push(s);
    },
    join(a, b, kind) {
      joins.push({ a: a.uid, b: b.uid, kind });
    },
    frame(f) {
      frames.push(f);
    },
  };
}
