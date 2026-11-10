/**
 * 21368 — bag 10: the two final displays.
 *  - typewriter display: manual steps 226–254, pages 183–205 (Snoopy typing on the roof)
 *  - campfire display:   manual steps 226–244, pages 206–224 (roof off, night sky, campfire)
 * Owned by one transcription session; see docs/TRANSCRIBING.md for conventions.
 *
 * Most parts here are placed with `raw` (LDraw origin in LDU) because they are SNOT-mounted.
 * `L(x, yPlates, z)` converts grid units of the sub-build's frame into LDU.
 */
import type { Vec3 } from "@/engine/units";
import { kit, orient, yaw, UP, type M3 } from "../dsl";

export const tw = kit("tw");
export const cf = kit("cf");

/** Grid (studs, plates, studs) → LDU. */
const L = (x: number, yPlates: number, z: number): Vec3 => [x * 20, -yPlates * 8, z * 20];

const BLK = "black";
const LBG = "light-bluish-gray";
const DBG = "dark-bluish-gray";
const BL = "bright-blue";

/** Studs facing the front (+z here, toward the lower left of the page), part x along x. */
const FACE_Z: M3 = orient([1, 0, 0], [0, 0, 1]);
/** Studs facing the back (−z), part x along x, part z up. */
const FACE_BACK: M3 = orient([1, 0, 0], [0, 0, -1]);

// ── Typewriter (steps 226–243, pages 184–193) ──────────────────────────────
// Frame grid: x = width of the typewriter (4 studs, keys), z toward the front (the typist
// sits behind, at −z), y up. The two black plates of step 226 span x 0–4, z 0–2.
{
  const { raw, step, join } = tw;
  tw.frame({ id: "tw-typewriter", label: "Typewriter", position: [0, 0, 0], rotation: [0, 0, 0] });
  tw.use("tw-typewriter");

  const p24 = raw("3020", BLK, L(2, 3, 1));
  const p14 = raw("3710", BLK, L(2, 4, 0.5));
  step(226, 184, [p24, p14]);

  // 2× (bracket 1×2–1×2 up, plate 2×2 with 2 studs on it, then the 2×2 with side studs in front)
  const s227 = [];
  for (const x of [1, 3]) {
    const br = raw("99780", BLK, L(x, 1, -0.5));
    const p2 = raw("33909", LBG, L(x, 2, 0));
    const ss = raw("4304", DBG, L(x, 2, 1.5), yaw(2));
    s227.push(br, p2, ss);
  }
  step(227, 184, s227);

  const keys = [];
  for (const x of [0.5, 1.5, 2.5, 3.5]) keys.push(raw("6141", LBG, L(x, 5, 0.5)), raw("6141", LBG, L(x, 4, 1.5)));
  step(228, 185, keys);

  // front: plates on the four side studs (centre 1¼ plates up = 10 LDU)
  const fl = raw("3024", BLK, [10, -10, 48], FACE_Z);
  const rail = raw("32028", LBG, [40, -10, 48], FACE_Z);
  const fr = raw("3024", BLK, [70, -10, 48], FACE_Z);
  step(229, 185, [fl, rail, fr]);

  // front bar: tile 1×4 on a 1×2 plate, curved 1×2 bricks at both ends, 65° slopes as side arms
  const bp = raw("3023", BL, [40, -10, 64], FACE_Z);
  const bt = raw("2431", BL, [40, -10, 72], FACE_Z);
  const cl = raw("5841", BL, [10, -10, 72], orient([0, 1, 0], [0, 0, 1], [1, 0, 0]));
  const cr = raw("5841", BL, [70, -10, 72], orient([0, -1, 0], [0, 0, 1], [-1, 0, 0]));
  // 65° slopes as side arms: stud forward into the curved bricks' underside, running up and back
  const al = raw("60481", BL, [-10, -10, 48], FACE_Z);
  const ar = raw("60481", BL, [90, -10, 48], FACE_Z);
  step(230, 186, [bp, bt, cl, cr, al, ar]);

  // Back (view turned round): the 99780 flanges' side studs face −z at z = −1.2 (y centre ½ stud).
  // 231/232: corner plate 2×2 standing on a 1×1×⅔ plate, a curved 1×3 slope under its outer-upper cell.
  const lp = raw("86996", BL, [10, -10, -40], FACE_BACK);
  const lc = raw("2420", BL, [-10, -10, -48], FACE_BACK);
  const lk = raw("70681", BL, [-10, -30, -40], orient([0, 1, 0], [0, 0, -1], [-1, 0, 0]));
  step(231, 187, [lc, lp, lk]);
  const rp = raw("86996", BL, [70, -10, -40], FACE_BACK);
  const rc = raw("2420", BL, [90, -10, -48], orient([0, 1, 0], [0, 0, -1], [-1, 0, 0]));
  const rk = raw("70681", BL, [90, -30, -40], orient([0, -1, 0], [0, 0, -1], [1, 0, 0]));
  step(232, 187, [rc, rp, rk]);

  // 233: bracket 1×2–1×2 (DBG) on the two middle flange studs, its second plate on top running forward
  const mb = raw("99781", DBG, [40, -10, -32], orient([-1, 0, 0], [0, 0, -1], [0, -1, 0]));
  step(233, 188, [mb]);
  // 234: two tiles with clip on its top studs (y = 1.2 studs)
  const c1 = raw("15712", DBG, [30, -32, -22]);
  const c2 = raw("15712", DBG, [50, -32, -22]);
  step(234, 188, [c1, c2]);
}

export { UP };
