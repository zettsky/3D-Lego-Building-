/**
 * Geometric checks for parts placed with LDraw poses (Phase 3).
 *
 *  - Stud connections: a stud of one part meets a socket (the underside stud cell) of another
 *    part at the same point, pointing the opposite way. Stud positions and directions come
 *    from the LDraw geometry itself, so this works for sideways and upside-down building.
 *  - Other connections (clips on bars, pins, axles, ball joints, hinges, turntables) cannot be
 *    derived from stud geometry; the model declares them as `joins`, and the check confirms
 *    the two parts actually touch.
 *  - Collisions: the oriented body boxes of two parts may not overlap by more than a small
 *    tolerance. Rounded and irregular parts are boxed generously, so their overlaps are
 *    reported separately as `near` rather than as errors.
 */
import * as THREE from "three";
import type { BrickInstance } from "./assembly";
import { posedBox, posedSockets, posedStuds, type LdPose } from "./ldraw/library";
import { getPart } from "./parts";

export interface Join {
  a: string;
  b: string;
  kind: "clip" | "pin" | "axle" | "ball" | "hinge" | "turntable" | "bar" | "side" | "rest";
}

export interface PosedIssue {
  kind: "collision" | "near" | "unconnected" | "join-gap" | "no-pose";
  uid: string;
  other?: string;
  message: string;
}

const TOL = 1.2; // LDU

/** Pairs of uids joined by a stud connection. */
export function studConnections(bricks: BrickInstance[]): [string, string][] {
  const sockets: { uid: string; pos: THREE.Vector3; dir: THREE.Vector3 }[] = [];
  for (const b of bricks) if (b.pose) for (const s of posedSockets(b.partId, b.pose)) sockets.push({ uid: b.uid, ...s });
  const grid = new Map<string, typeof sockets>();
  const key = (v: THREE.Vector3) => `${Math.round(v.x / 5)},${Math.round(v.y / 4)},${Math.round(v.z / 5)}`;
  for (const s of sockets) {
    const k = key(s.pos);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(s);
  }
  const out = new Map<string, [string, string]>();
  for (const b of bricks) {
    if (!b.pose) continue;
    for (const st of posedStuds(b.partId, b.pose)) {
      const near: typeof sockets = [];
      const cx = Math.round(st.pos.x / 5), cy = Math.round(st.pos.y / 4), cz = Math.round(st.pos.z / 5);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) near.push(...(grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []));
      for (const s of near) {
        if (s.uid === b.uid) continue;
        if (s.pos.distanceTo(st.pos) > TOL) continue;
        if (s.dir.dot(st.dir) > -0.9) continue;
        const pair: [string, string] = b.uid < s.uid ? [b.uid, s.uid] : [s.uid, b.uid];
        out.set(pair.join("|"), pair);
      }
    }
  }
  return [...out.values()];
}

/** Separating-axis test for two oriented boxes; returns penetration depth (≤ 0 = apart). */
function obbOverlap(A: ReturnType<typeof posedBox>, B: ReturnType<typeof posedBox>): number {
  const axes = [...A.axes, ...B.axes];
  for (const a of A.axes) for (const b of B.axes) {
    const c = new THREE.Vector3().crossVectors(a, b);
    if (c.lengthSq() > 1e-6) axes.push(c.normalize());
  }
  const d = new THREE.Vector3().subVectors(B.c, A.c);
  let min = Infinity;
  for (const ax of axes) {
    const ra = A.half.reduce((s, h, k) => s + Math.max(0, h) * Math.abs(A.axes[k].dot(ax)), 0);
    const rb = B.half.reduce((s, h, k) => s + Math.max(0, h) * Math.abs(B.axes[k].dot(ax)), 0);
    const pen = ra + rb - Math.abs(d.dot(ax));
    if (pen <= 0) return pen;
    min = Math.min(min, pen);
  }
  return min;
}

const BOXY = new Set(["brick", "plate", "tile", "panel"]);

function isBoxy(partId: string): boolean {
  const p = getPart(partId);
  return BOXY.has(p.category) && !/Round|Curved|Wedge|Macaroni|Dish|with Handle|Clip|Bar|Hole|Corner/i.test(p.name);
}

/** Which bricks touch: their boxes (grown by `pad`) overlap. */
export function touching(a: BrickInstance, b: BrickInstance, pad = 2): boolean {
  if (!a.pose || !b.pose) return false;
  const A = posedBox(a.partId, a.pose, -pad);
  const B = posedBox(b.partId, b.pose, -pad);
  return obbOverlap(A, B) > 0;
}

/**
 * Validate posed bricks that share one coordinate space.
 * `grounded` decides which bricks count as held without studs (e.g. the first part of a
 * sub-assembly, or `anchor` bricks).
 */
export function validatePosed(bricks: BrickInstance[], joins: Join[] = []): { issues: PosedIssue[]; components: string[][] } {
  const issues: PosedIssue[] = [];
  const posed = bricks.filter((b) => {
    if (!b.pose) issues.push({ kind: "no-pose", uid: b.uid, message: `${b.uid} has no LDraw pose` });
    return !!b.pose;
  });
  // collisions
  const boxes = new Map(posed.map((b) => [b.uid, posedBox(b.partId, b.pose as LdPose, 2)]));
  // Parts joined by an axle, pin or clip pass through each other by design.
  const inserted = new Set(joins.map((j) => [j.a, j.b].sort().join("|")));
  for (let i = 0; i < posed.length; i++)
    for (let j = i + 1; j < posed.length; j++) {
      const A = boxes.get(posed[i].uid)!;
      const B = boxes.get(posed[j].uid)!;
      if (A.c.distanceTo(B.c) > 400) continue;
      if (inserted.has([posed[i].uid, posed[j].uid].sort().join("|"))) continue;
      const pen = obbOverlap(A, B);
      if (pen > 0.5) {
        const hard = isBoxy(posed[i].partId) && isBoxy(posed[j].partId);
        issues.push({
          kind: hard ? "collision" : "near",
          uid: posed[i].uid,
          other: posed[j].uid,
          message: `${posed[i].partId} ${posed[i].uid} overlaps ${posed[j].partId} ${posed[j].uid} by ${pen.toFixed(1)} LDU`,
        });
      }
    }
  // connectivity: union-find over stud connections and declared joins
  const parent = new Map(posed.map((b) => [b.uid, b.uid]));
  const find = (u: string): string => {
    let r = u;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(u, r);
    return r;
  };
  const union = (a: string, b: string) => {
    if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  };
  for (const [a, b] of studConnections(posed)) union(a, b);
  const byUid = new Map(posed.map((b) => [b.uid, b]));
  for (const j of joins) {
    const A = byUid.get(j.a);
    const B = byUid.get(j.b);
    if (!A || !B) continue;
    if (!touching(A, B)) issues.push({ kind: "join-gap", uid: j.a, other: j.b, message: `${j.kind} join ${j.a}–${j.b}: parts do not touch` });
    union(j.a, j.b);
  }
  const comps = new Map<string, string[]>();
  for (const b of posed) {
    const r = find(b.uid);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r)!.push(b.uid);
  }
  return { issues, components: [...comps.values()] };
}
