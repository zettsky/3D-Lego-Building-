/**
 * 21368 — Snoopy (manual steps 1–78, bags 1–3).
 *
 * Coordinates follow the manual's camera: +x runs toward the lower right of the page, +z
 * toward the lower left, y up. Sub-builds use their own frames, posed as the manual builds
 * them, and are moved into place on the step that attaches them.
 */
import { BACK, FRONT, LEFT, RIGHT, UP, kit, orient, yaw } from "../dsl";

export const sn = kit("sn");
const { put, raw, step, join } = sn;

const W = "white";
const DG = "dark-bluish-gray";

// ── Bag 1 · torso, built lying on its back (steps 1–12) ─────────────────────
sn.frame({ id: "torso", label: "Snoopy's body", position: [0, 0, 0], rotation: [0, 0, 0] });
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

export { BACK, FRONT, LEFT, RIGHT };
