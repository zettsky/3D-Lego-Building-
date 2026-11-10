/**
 * 21368 — the lawn (bag 4) (manual steps 79–127, pages 64–96).
 * See docs/TRANSCRIBING.md for conventions. Coordinates: the manual's camera (+x lower right,
 * +z lower left, y up); `raw` positions in LDU with LDraw's −y up.
 */
import { kit, orient } from "../dsl";

export const lw = kit("lw");
const { raw, step } = lw;

const G = "green";
const DBG = "dark-bluish-gray";
type V3 = [number, number, number];
const UPV: V3 = [0, 1, 0];
const ALONG_Z = orient([0, 0, 1], UPV); // part x → +z, studs up
const SIDE_PX = orient([0, 0, 1], UPV); // 87087: side stud (part −z) → +x
const FACE_PZ = orient([-1, 0, 0], UPV); // 79389: hanging face (part −z) → +z

// ── First lawn wall (steps 79–85): a 1-stud-thick wall standing on a 1×10 plate, along z
// (cells z 0..200, end cell 0 at −z / upper right, cell 9 at +z / lower left). Both ends carry
// side-stud bricks facing +x and brackets whose hanging faces cover the end faces.
lw.frame({ id: "lw-wall1", label: "Lawn wall", position: [0, 0, 0], rotation: [0, 0, 0] });
lw.use("lw-wall1");
const cz = (c: number) => 10 + 20 * c; // centre of cell c
step(79, 64, [raw("4477", G, [10, -8, 100], ALONG_Z), raw("87087", G, [10, -32, cz(0)], SIDE_PX)]);
step(80, 65, [raw("87087", G, [10, -32, cz(9)], SIDE_PX), raw("3009", G, [10, -32, 80], ALONG_Z), raw("3004", G, [10, -32, 160], ALONG_Z)]);
step(81, 65, [raw("79389", G, [10, -40, cz(0)]), raw("79389", G, [10, -40, cz(9)], FACE_PZ)]);
step(82, 66, [raw("3009", G, [10, -56, 80], ALONG_Z), raw("3004", G, [10, -56, 160], ALONG_Z)]);
step(83, 66, [raw("3010", G, [10, -80, 60], ALONG_Z), raw("3010", G, [10, -80, 140], ALONG_Z)]);
step(84, 67, [0, 9].flatMap((c) => [raw("3024", G, [10, -48, cz(c)]), raw("87087", G, [10, -72, cz(c)], SIDE_PX)]));
step(85, 67, [raw("79389", G, [10, -80, cz(0)]), raw("79389", G, [10, -80, cz(9)], FACE_PZ)]);
// 86 · next course: dark grey rounded 1×2 bricks with centre bars at cells 1–2 and 7–8, 1×4 between.
step(86, 68, [raw("77808", DBG, [10, -104, 40], ALONG_Z), raw("3010", G, [10, -104, 100], ALONG_Z), raw("77808", DBG, [10, -104, 160], ALONG_Z)]);
// 87 · 2× (bracket 1×1–2×1 up with two 1×1 plates on its base) on the end brackets' studs, the
// upright faces outward over the end faces.
const FACE_UP_PZ = orient([-1, 0, 0], UPV); // 73825: face (part −z) → +z
step(87, 68, [0, 9].flatMap((c) => [
  raw("73825", G, [10, -88, cz(c)], c === 9 ? FACE_UP_PZ : undefined),
  raw("3024", G, [10, -96, cz(c)]),
  raw("3024", G, [10, -104, cz(c)]),
]));
// 88 · two 1×10 bricks over the whole length.
step(88, 69, [raw("6111", G, [10, -128, 100], ALONG_Z), raw("6111", G, [10, -152, 100], ALONG_Z)]);
// 89 · 2× down-bracket on the end studs, faces hanging over the ends.
step(89, 69, [raw("79389", G, [10, -160, cz(0)]), raw("79389", G, [10, -160, cz(9)], FACE_PZ)]);
// 90 · 1×6 (cells 1–6) and 1×2 (cells 7–8) bricks.
step(90, 70, [raw("3009", G, [10, -176, 80], ALONG_Z), raw("3004", G, [10, -176, 160], ALONG_Z)]);
// 91 · 2× (up-bracket with a 1×1 plate on its base) on the end studs.
step(91, 70, [0, 9].flatMap((c) => [raw("73825", G, [10, -168, cz(c)], c === 9 ? FACE_UP_PZ : undefined), raw("3024", G, [10, -176, cz(c)])]));
// 92 · top course over all ten cells: 1×4 (0–3), side-stud brick facing +x (4), 1×3 (5–7), 1×2 (8–9).
step(92, 71, [
  raw("3010", G, [10, -200, 40], ALONG_Z),
  raw("87087", G, [10, -200, cz(4)], SIDE_PX),
  raw("3622", G, [10, -200, 130], ALONG_Z),
  raw("3004", G, [10, -200, 180], ALONG_Z),
]);

// ── Second lawn wall (steps 93–96 so far): a 1×10 plate along x (cells x 0..200, cell 0 at −x),
// towers at both ends with brackets whose faces cover the end faces (−x / +x).
lw.frame({ id: "lw-wall2", label: "Lawn wall (second)", position: [0, 0, 16], rotation: [0, 0, 0] });
lw.use("lw-wall2");
const cx = (c: number) => 10 + 20 * c;
const FACE_MX = orient([0, 0, -1], UPV); // bracket face (part −z) → −x
const FACE_PX = orient([0, 0, 1], UPV); // → +x
step(93, 72, [raw("4477", G, [100, -8, 10]), raw("3004", G, [20, -32, 10]), raw("3004", G, [180, -32, 10])]);
// 94 · down-bracket on each outer cell (face over the end), 1×1 plate on each inner cell.
step(94, 72, [raw("79389", G, [cx(0), -40, 10], FACE_MX), raw("3024", G, [cx(1), -40, 10]), raw("79389", G, [cx(9), -40, 10], FACE_PX), raw("3024", G, [cx(8), -40, 10])]);
// 95 · up-bracket on each outer cell (face rising over the end), 1×1 plate on each inner cell.
step(95, 73, [raw("73825", G, [cx(0), -48, 10], FACE_MX), raw("3024", G, [cx(1), -48, 10]), raw("73825", G, [cx(9), -48, 10], FACE_PX), raw("3024", G, [cx(8), -48, 10])]);
// 96 · 1×2 brick on each tower.
step(96, 73, [raw("3004", G, [20, -72, 10]), raw("3004", G, [180, -72, 10])]);
// TODO 97–127: from step 97 the outer cell gets a two-plate stack and the inner cell a side-stud
// brick, which come out one plate apart while step 99 lays a 1×2 brick across both; not resolved.
