/**
 * 21368 — Snoopy (manual steps 1–78, bags 1–3).
 *
 * Coordinates follow the manual's camera: +x runs toward the lower right of the page, +z
 * toward the lower left, y up. Sub-builds use their own frames, posed as the manual builds
 * them, and are moved into place on the step that attaches them.
 */
import { BACK, FRONT, LEFT, RIGHT, UP, kit, yaw } from "../dsl";

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

export { BACK, FRONT, LEFT, RIGHT };
