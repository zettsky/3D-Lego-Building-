/**
 * 21368 — Snoopy (manual steps 1–78, bags 1–3).
 *
 * Coordinates follow the manual's camera: +x runs toward the lower right of the page, +z
 * toward the lower left, y up. Sub-builds use their own frames, posed as the manual builds
 * them, and are moved into place on the step that attaches them.
 */
import type { FrameDef } from "@/engine/frames";
import { BACK, FRONT, LEFT, RIGHT, UP, kit, orient, yaw } from "../dsl";
import { LEGO_21368 } from "./index"; // read lazily (attach step index), after both modules load

export const sn = kit("sn");
const { put, raw, step, join } = sn;

const W = "white";
const DG = "dark-bluish-gray";

// ── Bag 1 · torso, built lying on its back (steps 1–12) ─────────────────────
// Built lying on its back (steps 1–11); from step 12 it stands: torso +x up, its back (studs, +y)
// toward −x, feet on the ground (soles at torso x −80).
const torsoFrame: FrameDef = { id: "torso", label: "Snoopy's body", position: [0, 4, 0], rotation: [0, 0, Math.PI / 2], staging: { position: [0, 0, 0], rotation: [0, 0, 0] } };
Object.defineProperty(torsoFrame, "attachStep", { enumerable: true, get: () => LEGO_21368.steps.findIndex((st) => (st.manualStep ?? 0) >= 12) });
sn.frame(torsoFrame);
sn.use("torso");
const plate = put("3021", W, [0, 0, 0]);
const core = put("77808", DG, [0, 1, 0], yaw(1));
step(1, 11, [plate, core]);

const red = put("32064a", "red", [1, 1, 0], yaw(1));
const tech = put("3700", W, [2, 1, 0], yaw(1));
// Axle 5.5 with stop: stop end in the red brick, running along +x through both holes.
const axle = raw("59426", DG, [(1.0 + 2.725) * 20, -(1 * 8 + 14), 20], UP);
join(axle, red, "axle");
join(axle, tech, "axle");
step(2, 12, [red, tech, axle]);

// 3 · brackets hanging down both long sides: 1×2–2×2 over the dark and red bricks, 1×1–2×1
// on the technic brick's studs. Front (+z) pair shown; the back pair mirrors it (the second
// 1×2–2×2 is the one drawn coming down onto the back row).
const bF = put("44728", W, [0, 0, 1], yaw(2));
const cF = put("79389", W, [2, 0, 1], yaw(2));
// Back pair by LDraw origin: their faces hang outside the 2-stud depth, which the grid
// footprint cannot express for a face on the −z side.
const bB = raw("44728", W, [20, -40, 10]);
const cB = raw("79389", W, [50, -40, 10]);
step(3, 13, [bF, cF, bB, cB]);

// 4–7 · onto the axle (centre line y −22, z 20 LDU), from the block face at x 60 outward.
// Orientations: part "up" (−LDraw y) or part z along the axle (+x).
const ALONG_UP = orient([0, 0, 1], [1, 0, 0], [0, 1, 0]); // part up → +x, part z → scene up
const conn = raw("18654", W, [70, -22, 20], ALONG_UP); // round 1L connector, x 60–80
join(axle, conn, "axle");
step(4, 13, [conn]);

// Life ring around the connector, against the block, its stud facing out (+x) at the top;
// its centre sits 19 LDU from the stud (outer radius 24, bounds z −43..5).
const ring = raw("30340", "black", [68, -41, 20], ALONG_UP);
// Driving ring extension, clutch teeth toward the free end: part z → −x, x 80–108.
const drive = raw("35186", W, [90, -22, 20], orient([0, 0, 1], [0, 1, 0], [-1, 0, 0]));
join(ring, conn, "rest");
join(axle, drive, "axle");
step(5, 14, [ring, drive]);

const bush = raw("32123b", W, [113, -22, 20], orient([0, 0, -1], [0, 1, 0], [1, 0, 0])); // x 108–118
join(axle, bush, "axle");
step(6, 14, [bush]);

// Ball joint: flat end with the blind axle hole against the bush, ball pointing +x.
const ball = raw("32474", W, [127.25, -22, 20], ALONG_UP);
join(axle, ball, "axle");
step(7, 15, [ball]);

// 8 · 2× (1×1 plate under the thick end of a curved 2×1 slope) on the lower row of each long
// side: the slope spans x 0–2 with its thick, square end toward the ring (+x), so the plate
// takes the second lower stud and the thin end clears the first. 11477's thick end is its −z
// end (checked in the viewer) and its underside is at its origin. Face studs start at z 44 (front) and z −4 (back);
// lower row centre y −10. The back pair mirrors the front one (180° about x).
const pF = raw("3024", W, [30, -10, 52], orient([1, 0, 0], [0, 0, 1], [0, -1, 0]));
const sF = raw("11477", W, [20, -10, 52], orient([0, -1, 0], [0, 0, 1], [-1, 0, 0]));
const pB = raw("3024", W, [30, -10, -12], orient([1, 0, 0], [0, 0, -1], [0, 1, 0]));
const sB = raw("11477", W, [20, -10, -12], orient([0, 1, 0], [0, 0, -1], [-1, 0, 0]));
step(8, 15, [pF, sF, pB, sB]);

// 9 · 2× (rounded 1×2 plate with 2 open studs; 1×1 tile on its left stud, round 1×1 plate with
// open stud on its right stud, bar-with-clip pushed into that open stud) on the upper row
// (y −30) of each long side, studs facing out. The bar (22.5 LDU, ending 30 below the clip
// origin) goes down through both open studs to the bracket's face stud (z 48 front, −8 back).
const OUT_F = orient([1, 0, 0], [0, 0, 1], [0, -1, 0]); // studs → +z
const OUT_B = orient([1, 0, 0], [0, 0, -1], [0, 1, 0]); // studs → −z (the front turned 180° about x)
const s9: ReturnType<typeof raw>[] = [];
// The clips grip a vertical bar (the leg handles of step 11), so their own x runs vertically.
const CLIP_F = orient([0, -1, 0], [0, 0, 1], [-1, 0, 0]);
const CLIP_B = orient([0, 1, 0], [0, 0, -1], [-1, 0, 0]);
const clips: ReturnType<typeof raw>[] = [];
for (const [R, CR, face, dir] of [[OUT_F, CLIP_F, 44, 1], [OUT_B, CLIP_B, -4, -1]] as const) {
  const base = raw("35480", W, [20, -30, face + 8 * dir], R);
  const tile = raw("3070b", W, [10, -30, face + 16 * dir], R);
  const round = raw("85861", W, [30, -30, face + 16 * dir], R);
  const clip = raw("3484", W, [30, -30, face + 34 * dir], CR);
  clips.push(clip);
  join(clip, round, "bar");
  join(clip, base, "bar");
  s9.push(base, tile, round, clip);
}
step(9, 16, s9);

// 10 · cheese slopes on the upper stud of the 1×1–2×1 brackets, sloping down toward the base.
const chF = raw("54200", W, [50, -30, 44], orient([-1, 0, 0], [0, 0, 1], [0, 1, 0]));
const chB = raw("54200", W, [50, -30, -4], orient([-1, 0, 0], [0, 0, -1], [0, -1, 0]));
step(10, 16, [chF, chB]);

// 11 · 2× leg: plate 1×2 with handle on end; inverted curved slope on its far stud, the dome
// hanging past the plate's end; curved 2×1 slope on top over both cells. The handle clips into
// the step-9 clip (grip centre at the clip origin, x 30, y −30, z 78 / −38), the plate lying
// flat against the side with its studs out and the leg running +x.
// Note: LDraw's 24201 has a stepped top (its dome cell one plate lower), so the curved slope
// takes the raised stud only; its other socket clears the plate's near stud by 4 LDU. The
// manual draws both arrows; the parts' real geometry allows only this fit.
const legs: ReturnType<typeof raw>[] = [];
for (const [k, s, zc] of [[1, 1, 78], [-1, -1, -38]] as const) {
  // k = 1 front; k = −1 back (front turned 180° about the line y −30, z 20)
  const plate = raw("60478", W, [60, -30, zc + 2 * s], orient([-1, 0, 0], [0, 0, k], [0, k, 0]));
  const inv = raw("24201", W, [70, -30, zc + 10 * s], orient([0, k, 0], [0, 0, k], [1, 0, 0]));
  const top = raw("11477", W, [60, -30, zc + 10 * s], orient([0, -k, 0], [0, 0, k], [-1, 0, 0]));
  join(plate, clips[k === 1 ? 0 : 1], "clip");
  join(inv, plate, "rest");
  legs.push(plate, inv, top);
}
step(11, 17, legs);

// 12 · no new parts: the torso is turned upright (ball joint up). Its final pose is set on the
// step that joins it to the hip sub-build built in steps 13–19.
step(12, 17, [], "Turn the body upright: ball joint on top.");

// ── Bag 1 · lower body and feet (steps 13–20), its own frame ────────────────
// Frame axes as the manual draws it from step 15 on: long side along z (x 0..40, z 0..80 LDU),
// the red plate's side facing +x. Levels: base 2×4 top at y 0, parts under it at y 8..16.
// Step 21 hangs it under the torso (turned 180° about x): its back (the red plate's underside)
// flush with the torso's back, the waist clip round the core brick's lower bar (torso x 2, y −12,
// z 10), the overhanging 2×4 against the torso's lower edge. hip LDU (x, y, z) → torso (x − 48, −y − 16, 60 − z).
const hipFrame: FrameDef = { id: "sn-hip", label: "Snoopy's lower body", parent: "torso", position: [-2.4, 0.8, 3], rotation: [Math.PI, 0, 0], staging: { position: [0, 0, 6], rotation: [0, 0, 0] } };
Object.defineProperty(hipFrame, "attachStep", { enumerable: true, get: () => LEGO_21368.steps.findIndex((st) => (st.manualStep ?? 0) >= 21) });
sn.frame(hipFrame);
sn.use("sn-hip");
type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]];
/** The one right-handed choice among two (part x, part z) assignments, studs along `up`. */
function either(up: V3, ...opts: [V3, V3][]) {
  const [x] = opts.find(([x, z]) => cross(x, up).every((v, i) => Math.abs(v - z[i]) < 1e-9))!;
  return orient(x, up);
}
const ALONG_Z = orient([0, 0, 1], [0, 1, 0]); // part x → +z, studs up
// 13 · built upside down: 2×4 plate, red 1×2 on its underside (centre of the red side).
const hipBase = raw("3020", W, [20, 0, 40], ALONG_Z);
const hipRed = raw("3023", "red", [30, 8, 40], ALONG_Z);
step(13, 18, [hipBase, hipRed]);
// 14 · two rounded-corner plates (79491: rounded cell diagonal to its 1×1 cut-out) fill the rest
// of the underside; each cut-out takes the red plate, so the rounded corners end up at the back.
const hipL = raw("79491", W, [10, 8, 70], orient([0, 0, -1], [0, 1, 0]));
const hipR = raw("79491", W, [10, 8, 10], orient([1, 0, 0], [0, 1, 0]));
step(14, 18, [hipL, hipR]);
// 15 · turned over. 1×1 plate front-left, 1×2 with vertical clip across the block at z 50 (clip
// out the front), rounded-corner plate on the right end: rounded front corner at z 30, cut-out
// in the back-right corner.
const hip11 = raw("3024", W, [30, -8, 70]);
const hipClip = raw("78256", W, [20, -8, 50]);
const hipTop = raw("79491", W, [30, -8, 30], orient([-1, 0, 0], [0, 1, 0]));
step(15, 18, [hip11, hipClip, hipTop]);
// 16 · 2× bracket 1×2 with 1×2 vertical studs (LDraw 4585, turned so its studded face is the
// horizontal arm and its plate the upright slab): a 1×1 plate under the arm cell next to the slab,
// a 1×1 tile on that cell. Both arms run front-to-back with the slab behind the base's back edge,
// on the two end columns; the 1×1 plates take the base's two open studs, the arms' front cells
// sit on the top layer.
const S16 = orient([0, 0, -1], [1, 0, 0]); // arm (part −y) → +x, face studs (part −z) up
const s16: ReturnType<typeof raw>[] = [];
for (const z of [70, 10]) {
  const under = raw("3024", W, [10, -8, z]);
  const br = raw("4585", W, [0, -12, z], S16);
  const tile = raw("3070b", W, [10, -24, z]);
  s16.push(under, br, tile);
}
step(16, 19, s16);
// 17 · 2×4 plate on the two bracket arms' front studs, overhanging the front by one row.
const hipTopPlate = raw("3020", W, [40, -24, 40], ALONG_Z);
step(17, 19, [hipTopPlate]);
// 18 · on it: 2×2 plate with 2 studs (studs on the back row) in the middle, quarter-round tiles
// on the back corners, 1×1 tiles on the front corners.
const UPV: V3 = [0, 1, 0];
const s18 = [
  raw("33909", W, [40, -32, 40], orient([0, 0, 1], UPV)),
  raw("25269", W, [30, -32, 70], either(UPV, [[-1, 0, 0], [0, 0, -1]], [[0, 0, 1], [1, 0, 0]])),
  raw("25269", W, [30, -32, 10], either(UPV, [[-1, 0, 0], [0, 0, 1]], [[0, 0, -1], [1, 0, 0]])),
  raw("3070b", W, [50, -32, 70]),
  raw("3070b", W, [50, -32, 10]),
];
step(18, 19, s18);
// 19–20 · the feet, each built lying down and pressed into one bracket slab's back.
// Foot coordinates: k 0..4 along its length, v 0 (stud row) / 1 (rounded side), w height above
// its bottom plates. Upright on the slab: length down the slab (k 2 and 3 on the slab's sockets),
// studs toward the body (+x), rounded side outward (z away from the block).
function foot(n: number, zc: number, s: 1 | -1) {
  const at = (k: number, v: number, w: number): V3 => [-24 + w, -62 + 20 * k, zc + 20 * s * v];
  const U: V3 = [0, -1, 0]; // +k (LDraw +y = scene down)
  const V: V3 = [0, 0, s];
  const Wd: V3 = [1, 0, 0]; // foot studs
  // 2×2 wedge plate (26601): its cut corner (part +x, −z) at the foot's rounded ends.
  const wedge = (k: number, toward: V3) => raw("26601", W, at(k, 0.5, 0), either(Wd, [toward, neg(V)], [V, neg(toward)]));
  // curved 2×2 corner brick (5846): stud cell at the part origin, rounded corner at part (−x, −z).
  const corner = (k: number, out: V3) => raw("5846", W, at(k, 0, 24), either(Wd, [neg(out), neg(V)], [neg(V), neg(out)]));
  const b1 = raw("3023", W, at(2, 0.5, 0), orient(V, Wd));
  const p13 = raw("3623", W, at(2, 0, 8), orient(U, Wd));
  const wl = wedge(0.5, neg(U));
  const wr = wedge(3.5, U);
  const mid = raw("5841", W, at(2, 0, 24), orient(cross(Wd, neg(V)), Wd)); // curved cell at part −z → rounded side
  const cl = corner(1, neg(U));
  const cr = corner(3, U);
  const tile = raw("3070b", W, at(1, 0, 24), orient(V, Wd));
  step(n, n === 19 ? 20 : 21, [b1, p13, wl, wr, mid, cl, cr, tile]);
}
foot(19, 70, 1);
foot(20, 10, -1);

// 21 · no new parts: the legs go under the body (see the sn-hip frame).
sn.use("torso");
step(21, 22, [], "Put the legs under the body: the waist clip grips the core brick's lower bar.");

export { BACK, FRONT, LEFT, RIGHT };
