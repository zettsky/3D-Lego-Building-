/**
 * 21368 — Woodstock (manual steps W1–W11, stored as 78.01–78.11, pages 60–62).
 * Owned by one transcription session; see docs/TRANSCRIBING.md for conventions.
 *
 * Woodstock is built standing, in the manual's camera for pages 60–62: +x runs toward the
 * lower right (his front: belly tile, beak), +z toward the lower left, y up. Everything is a
 * stack of 1 × 1 parts around two "Brick 1 × 1 with Studs on Four Sides" (body and head),
 * held together by a 3L bar through both, so parts are placed by their LDraw origin (`raw`)
 * and seated on the exact stud they plug into (`seat`).
 *
 * Frame-local LDU: origin at the centre of the feet plate's underside, −y up.
 *   feet plate 26047   y −8…0      body brick   y −32…−8
 *   round plates       y −48…−32   head brick   y −72…−48
 *   bar 87994          y −72…−12   (stands on the feet plate's stud, top flush with the head brick)
 *
 * Woodstock's head, part 5648 "Helmet Dome, No Stud", is the only hand-made part shape in
 * the model (tools/ldraw-custom/parts/5648.dat); its placement is as exact as any other part.
 */
import type { BrickInstance } from "@/engine/assembly";
import { ldFootprint } from "@/engine/ldraw/library";
import type { Vec3 } from "@/engine/units";
import { orient, UP, yaw, kit, type M3 } from "../dsl";

export const wd = kit("wd");
const { raw, join } = wd;

const Y = "yellow";

/** LDraw-space vector of a part (LDU, −y up) rotated by a scene-space orientation. */
const ld = (R: M3, v: Vec3): Vec3 => {
  const s = [v[0], -v[1], v[2]];
  return [R[0] * s[0] + R[1] * s[1] + R[2] * s[2], -(R[3] * s[0] + R[4] * s[1] + R[5] * s[2]), R[6] * s[0] + R[7] * s[1] + R[8] * s[2]];
};

/** Place a part so that the stud socket in the middle of its underside sits on `stud` (LDU). */
function seat(part: string, color: string, stud: Vec3, R: M3 = UP, socket?: Vec3): BrickInstance {
  const f = ldFootprint(part);
  const s = socket ?? [(f.x0 + f.x1) / 2, f.bottom, (f.z0 + f.z1) / 2];
  const o = ld(R, s);
  return raw(part, color, [stud[0] - o[0], stud[1] - o[1], stud[2] - o[2]], R);
}

function step(n: number, page: number, bricks: BrickInstance[], note?: string) {
  wd.step(78 + n / 100, page, bricks, note);
  wd.steps[wd.steps.length - 1].label = `W${n}`;
}

// Orientations (where the part's x, studs-up y and z axes point in the scene).
/** studs facing +x */
const TO_PX = (z: Vec3): M3 => orient(cross([1, 0, 0], z), [1, 0, 0], z);
/** studs facing −x */
const TO_NX = (z: Vec3): M3 => orient(cross([-1, 0, 0], z), [-1, 0, 0], z);
/** studs facing +z / −z */
const TO_PZ = (z: Vec3): M3 => orient(cross([0, 0, 1], z), [0, 0, 1], z);
const TO_NZ = (z: Vec3): M3 => orient(cross([0, 0, -1], z), [0, 0, -1], z);
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// Side studs of a 4733 whose top face is at LDU y = top (studs 10 LDU below the top face).
const sides = (top: number) => ({
  px: [10, top + 10, 0] as Vec3,
  nx: [-10, top + 10, 0] as Vec3,
  pz: [0, top + 10, 10] as Vec3,
  nz: [0, top + 10, -10] as Vec3,
  top: [0, top, 0] as Vec3,
});

// TODO(step 78.11 → doghouse roof): Woodstock ends up on the doghouse roof (doghouse.ts,
// steps 163–225). That file has no anchor for him yet, so the frame stands beside Snoopy at a
// placeholder position. Replace position/rotation (and add attachStep) once the roof exists.
wd.frame({ id: "wd-woodstock", label: "Woodstock", position: [6, 0, 0], rotation: [0, 0, 0] });
wd.use("wd-woodstock");

// ── W1 (page 60): body brick, belly tile on its front stud, rounded end down ──
const body = raw("4733", Y, [0, -32, 0]);
const B = sides(-32);
// 24246: rounded end is the part's −z; studs-up axis → +x, part z → up, so the round end hangs down.
const belly = seat("24246", Y, B.px, TO_PX([0, 1, 0]));
step(1, 60, [body, belly]);

// ── W2: feet — 26047 under the body, its handle (part −z) running along z in front (+x) ──
const feet = raw("26047", Y, [0, -8, 0], orient([0, 0, 1], [0, 1, 0], [-1, 0, 0]));
step(2, 60, [feet]);

// ── W3: wings — 15712 clip tiles on the ±z side studs, clip axis along x ──
const wingL = seat("15712", Y, B.pz, TO_PZ([1, 0, 0]));
const wingR = seat("15712", Y, B.nz, TO_NZ([1, 0, 0]));
step(3, 60, [wingL, wingR]);

// ── W4: 3L bar down through the body's open top stud, standing on the feet plate's stud ──
const bar = raw("87994", "light-bluish-gray", [0, -72, 0]);
join(bar, body, "bar");
step(4, 60, [bar]);

// ── W5 (page 61): tail — fork handle into the body's open back (−x) stud, tines flat ──
const fork = raw("79741", Y, [B.nx[0], B.nx[1], B.nx[2]], orient([0, 0, 1], [-1, 0, 0], [0, -1, 0]));
join(fork, body, "bar");
step(5, 61, [fork]);

// ── W6: neck — two 1 × 1 round plates with open stud slid down the bar ──
const neck1 = raw("85861", Y, [0, -40, 0]);
const neck2 = raw("85861", Y, [0, -48, 0]);
join(bar, neck1, "bar");
join(bar, neck2, "bar");
step(6, 61, [neck1, neck2]);

// ── W7: head brick on the bar (the bar shows inside its open top stud) ──
const head = raw("4733", Y, [0, -72, 0]);
join(bar, head, "bar");
const H = sides(-72);
step(7, 61, [head]);

// ── W8: cheeks — 24246 on the ±z side studs, rounded ends toward the back (−x) ──
const cheekL = seat("24246", Y, H.pz, TO_PZ([1, 0, 0]));
const cheekR = seat("24246", Y, H.nz, TO_NZ([1, 0, 0]));
step(8, 61, [cheekL, cheekR]);

// ── W9 (page 62): crest — 8098 grass on the top stud and on the back (−x) stud ──
// The checker boxes 8098 as 1 × 2 (its blades reach further in z), so its centred socket is
// declared as a join rather than found by the stud test.
const crestTop = seat("8098", Y, H.top, yaw(1), [0, 0, 0]);
const crestBack = seat("8098", Y, H.nx, TO_NX([0, 1, 0]), [0, 0, 0]);
join(crestTop, head, "rest");
join(crestBack, head, "rest");
step(9, 62, [crestTop, crestBack]);

// ── W10: black minifig head on the front (+x) stud, its stud pointing forward ──
const R_FACE = TO_PX([0, 0, 1]);
const skull = seat("28621", "black", H.px, R_FACE);
step(10, 62, [skull]);

// ── W11: the yellow helmet dome over it (5648.dat shares the minifig head's origin) ──
const dome = raw("5648pr0001", Y, skull.pose!.slice(0, 3) as Vec3, R_FACE);
join(dome, skull, "clip");
step(11, 62, [dome]);
