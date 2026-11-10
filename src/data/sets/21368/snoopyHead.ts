/**
 * 21368 — Snoopy's head (bags 2–3) (manual steps 28–78, pages 27–59).
 * Owned by one transcription session; see docs/TRANSCRIBING.md for conventions.
 *
 * Head frame `sh-head`: the manual's camera of steps 29–31 (+x lower right, +z lower left,
 * y up). From step 32 the manual shows the head turned 180° (view from −x,−z: use
 * `&v=-1,0.9,-1` in the step viewer). The core column stands on x 0..2, z 0..1.
 */
import { DOWN, FRONT, UP, kit, mulM, orient, yaw, type M3 } from "../dsl";

export const sh = kit("sh");
const { put, raw, step, join } = sh;

const W = "white";
const TAN = "tan";
const BK = "black";
const LG = "light-bluish-gray";
const DG = "dark-bluish-gray";
const RD = "red";
const YL = "yellow";

/** Studs of a part's own frame mapped by a mount rotation (sub-builds turned before attaching). */
const m = (mount: M3, local: M3 = UP): M3 => mulM(mount, local);

// ── Head core (steps 29–36) ─────────────────────────────────────────────────
sh.frame({ id: "sh-head", label: "Snoopy's head", position: [0, 0, 0], rotation: [0, 0, 0] });
sh.use("sh-head");

// 29 · white plate 1×2 with two tan 1×1 bricks with studs on two adjacent sides
const p29 = put("3023", W, [0, 0, 0]);
const t29a = put("26604", TAN, [1, 1, 0], yaw(3)); // studs +x, +z
const t29b = put("26604", TAN, [0, 1, 0], yaw(2)); // studs −x, +z
step(29, 27, [p29, t29a, t29b]);

// 30 · two black 1×1×1⅔ bricks with studs on 3 sides
const b30a = put("7729", BK, [0, 4, 0], yaw(1)); // studs −x, ±z
const b30b = put("7729", BK, [1, 4, 0], yaw(3)); // studs +x, ±z
step(30, 27, [b30a, b30b]);

// 31 · sub-build (plates 1×4, brick 2×3, technic brick, jumpers) built along its own z and
// turned so its studs face +z: its bottom plates take the column's +z side studs.
// Sub-build frame: x 0..2, y plates 0..5, z 0..4 (z 0 = tan end) → head: x, z = 1 + 0.4·y, y = 9 − 2.5·z.
const M31 = orient([1, 0, 0], [0, 0, 1]); // local y → +z, local z → −y
const s31 = [
  put("3710", W, [1, -1, 1], m(M31, yaw(1))), // 1x4 under the brick's +x column
  put("3002", LG, [0, 1.5, 1.4], m(M31, yaw(1))),
  put("3710", W, [0, -1, 1], m(M31, yaw(1))), // 1x4 slid under the −x column
  put("32064a", W, [0, -1, 1.4], M31),
  put("15573", TAN, [0, 6.5, 2.6], M31),
  put("34103", W, [0, -1, 2.6], m(M31, yaw(1))),
  put("34103", W, [1, -1, 2.6], m(M31, yaw(1))),
];
step(31, 28, s31);

// 32 · ball socket brick on the back (−z) studs of the black bricks, socket pointing down;
// round 2×2 brick on its studs.
const sock = raw("67696", DG, [20, -52, -24], orient([0, -1, 0], [0, 0, -1]));
const rnd = put("3941", LG, [0, 4, -2.4], FRONT);
step(32, 29, [sock, rnd], "Head turned around: view from the back (v=-1,0.9,-1).");

// 33 · axle 4 through the round brick into the socket brick, sticking out 1.6 studs
const axle = raw("3705", RD, [20, -52, -40], yaw(1));
join(axle, rnd, "axle");
join(axle, sock, "axle");
step(33, 29, [axle]);

// 34 · two white plates 1×2 and a red brick with studs on both sides on top of the column
const p34a = put("3023", W, [0, 9, 0]);
const p34b = put("3023", W, [0, 10, 0]);
const r34 = put("52107", RD, [0, 11, 0]);
step(34, 30, [p34a, p34b, r34]);

// 35 · sub-build: plate 2×2×⅔ with side studs, white plate on its low row, two yellow
// bricks with side studs; turned so the yellow studs face −z and it hangs on the red
// brick's −z side studs, resting on the socket brick.
const M35 = orient([0, 1, 0], [0, 0, -1]); // local x → +y, local y → −z, local z → −x
const s35 = [
  put("4304", LG, [0, 9, -0.8], m(M35, yaw(3))),
  put("3023", W, [0, 9, -0.8], m(M35, yaw(1))),
  put("11211", YL, [1, 9, -2], M35), // side studs → +x
  put("11211", YL, [0, 9, -2], m(M35, yaw(2))), // side studs → −x
];
// The white plate sits in the 4304's lowered row; the engine boxes the 4304 as a full
// 2×2×⅔ block, so record the contact as a join to keep it from counting as a collision.
join(s35[0], s35[1], "rest");
step(35, 30, s35);

// 36 · tan jumper on two grey 1×1×⅔ half-round plates with side stud (side studs up into
// the jumper), white 1×1 bricks with side stud on their studs; the grey plates plug onto the
// red brick's +z side studs.
const s36 = [
  put("3386", LG, [0, 11.5, 1], orient([1, 0, 0], [0, 0, 1])),
  put("3386", LG, [1, 11.5, 1], orient([1, 0, 0], [0, 0, 1])),
  put("15573", TAN, [0, 14, 1]),
  put("87087", W, [0, 11.5, 1.8], orient([0, 1, 0], [0, 0, 1])), // side stud −x
  put("87087", W, [1, 11.5, 1.8], orient([0, -1, 0], [0, 0, 1])), // side stud +x
];
step(36, 31, s36);

// ── Side panel A (steps 37–47), built on a 4×6 plate: panel frame X 0..4, Z 0..6 ──────────
sh.frame({ id: "sh-side-a", label: "Head side (first)", position: [-10, 0, 0], rotation: [0, 0, 0] });
sh.use("sh-side-a");
const pa = put("3032", W, [0, 0, 0], yaw(1));
const ca = put("79491", W, [0, 1, 0], yaw(2)); // rounded corner at X0 Z0, cut-out at X1 Z1
step(37, 32, [pa, ca]);
const da = put("3024", BK, [1, 1, 1]);
const ba = put("3002", W, [0, 1, 2], yaw(1));
step(38, 32, [da, ba]);

// TODO steps 39–78 not transcribed yet (side panel A from step 39, side B 49–60, top 61–66,
// muzzle 67–76, attach to the body's ball joint 77, ears 78). Side panel A's final mount on
// the head's −x side studs (step 48) is also still TODO: the frame is staged at x −10.

export { DOWN };
