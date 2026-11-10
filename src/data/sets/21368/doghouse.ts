/**
 * 21368 — the red doghouse (bags 6–9) (manual steps 163–225, pages 117–174).
 * Owned by one transcription session; see docs/TRANSCRIBING.md for conventions.
 *
 * House grid (frame `dh-house`): +x along the back wall toward the lower right of the page,
 * +z toward the front (the SNOOPY arch, lower left), y up. Its origin is the bottom of the
 * upper back wall (step 163); the lower walls added in steps 197–198 sit below it.
 */
import { kit, yaw, type M3 } from "../dsl";
import type { FrameDef } from "@/engine/frames";
// Circular on purpose: only read lazily, after both modules have loaded.
import { LEGO_21368 } from "./index";

export const dh = kit("dh");
const { put, step } = dh;

const R = "red";

/**
 * Frames attach on a step *index* of the combined instruction, which depends on how many
 * steps the other sections have. Resolve it lazily from the manual step number (steps 1–225
 * come first in both 21368 instructions, so the index is the same in each).
 */
function frame(f: Omit<FrameDef, "attachStep"> & { attachAt?: number }) {
  const { attachAt, ...rest } = f;
  const def = rest as FrameDef;
  if (attachAt !== undefined)
    Object.defineProperty(def, "attachStep", {
      enumerable: true,
      get: () => LEGO_21368.steps.findIndex((s) => (s.manualStep ?? 0) >= attachAt),
    });
  dh.frame(def);
}

/** Orientations: studs up, part's own z axis toward −x / +x / −z / +z. */
const ZtoMX: M3 = yaw(3);
const ZtoPX: M3 = yaw(1);
const ZtoPZ: M3 = yaw(2);
/** Panels with their open side to the front (+z). */
const P: M3 = yaw(2);
const K = "black";
const W = "white";
const PL = 0.4;

// ── Bag 6 · upper back wall (steps 163–171), built standing ──────────────────
frame({ id: "dh-house", label: "Doghouse", position: [0, 0, 0], rotation: [0, 0, 0] }); // TODO(225): pose on the lawn
dh.use("dh-house");

step(163, 117, [put("60479", R, [0, 0, 0]), put("87544", R, [5, 1, 0], P)]);
step(164, 118, [put("60581", R, [1, 1, 0], P), put("60581", R, [7, 1, 0], P)]);
// End columns: brick with 1 side stud, brick with 2 side studs, 1×1 plate; side studs outward.
step(165, 118, [
  put("87087", R, [0, 1, 0], ZtoPX), put("32952", R, [0, 4, 0], ZtoPX), put("3024", R, [0, 9, 0]),
  put("87087", R, [11, 1, 0], ZtoMX), put("32952", R, [11, 4, 0], ZtoMX), put("3024", R, [11, 9, 0]),
]);
step(166, 119, [put("60479", R, [0, 10, 0])]);
step(167, 120, [put("14716", R, [3, 11, 0]), put("60581", R, [4, 11, 0], P), put("14716", R, [8, 11, 0])]);
step(168, 120, [
  put("87087", R, [0, 11, 0], ZtoPX), put("3004", R, [1, 11, 0]),
  put("3004", R, [9, 11, 0]), put("87087", R, [11, 11, 0], ZtoMX),
]);
// 1×3 plate on a 1×2 plate, with the slope plate's fin overhanging the wall end (eave).
step(169, 121, [
  put("15672", R, [-1, 14, 0], ZtoPX), put("3023", R, [1, 14, 0]), put("3623", R, [0, 15, 0]),
  put("3023", R, [9, 14, 0]), put("15672", R, [11, 14, 0], ZtoMX), put("3623", R, [9, 15, 0]),
]);
step(170, 122, [
  put("3040b", R, [0, 16, 0], ZtoPX), put("87087", R, [2, 16, 0], ZtoPZ),
  put("87087", R, [9, 16, 0], ZtoPZ), put("3040b", R, [10, 16, 0], ZtoMX),
]);
step(171, 122, [
  put("15672", R, [1, 19, 0], ZtoPX), put("3024", R, [2, 20, 0]),
  put("15672", R, [9, 19, 0], ZtoMX), put("3024", R, [9, 20, 0]),
]);

// ── Ceiling (steps 172–178), built flat: x across (6), z front–back (12) ─────
frame({
  id: "dh-ceil", label: "Ceiling", parent: "dh-house", position: [3, 12 * PL, 1], rotation: [0, 0, 0],
  staging: { position: [-12, 12 * PL, 1], rotation: [0, 0, 0] }, attachAt: 178,
});
dh.use("dh-ceil");
step(172, 123, [put("3020", K, [1, 1, 5]), put("3022", W, [2, 2, 5])]);
step(173, 123, [
  put("2445", R, [0, 0, 0], yaw(1)), put("44861", K, [0, 1, 2], yaw(2)), put("44861", K, [0, 1, 9], yaw(2)),
  put("2445", R, [4, 0, 0], yaw(1)), put("44861", K, [4, 1, 2]), put("44861", K, [4, 1, 9]),
]);
// Two end pieces bridging the gap: lower 1×2 plate + corner plate, upper corner plate + 1×2 plate.
step(174, 124, [
  put("3023", R, [2, 1, 0]), put("2420", R, [1, 1, 0], yaw(1)), put("2420", R, [3, 2, 0], yaw(3)), put("3023", R, [1, 2, 0]),
  put("3023", R, [2, 1, 11]), put("2420", R, [1, 1, 10]), put("2420", R, [3, 2, 10], yaw(2)), put("3023", R, [1, 2, 11]),
]);
step(175, 125, [put("60479", R, [1, 3, 0], yaw(1)), put("60479", R, [4, 3, 0], yaw(1))]);
step(176, 126, [
  put("3024", R, [2, 3, 0]), put("3024", R, [3, 3, 0]), put("3024", R, [2, 3, 11]), put("3024", R, [3, 3, 11]),
  put("2445", R, [2, 4, 0], yaw(1)),
]);
// Round tiles with pins: where the roof-ridge supports (step 206) sit.
step(177, 126, [
  put("3023", R, [2, 5, 0]), put("3023", R, [2, 5, 11]),
  ...[0, 11].flatMap((z) => [put("20482", K, [2, 6, z]), put("20482", K, [3, 6, z])]),
  ...[4, 7].flatMap((z) => [put("20482", K, [2, 5, z]), put("20482", K, [3, 5, z])]),
]);
step(178, 127, []);
