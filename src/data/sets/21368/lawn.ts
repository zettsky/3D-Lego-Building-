/**
 * 21368 — the lawn (bag 4) (manual steps 79–127, pages 64–96).
 * See docs/TRANSCRIBING.md for conventions. Coordinates: the manual's camera (+x lower right,
 * +z lower left, y up); `raw` positions in LDU with LDraw's −y up.
 */
import type { FrameDef } from "@/engine/frames";
import { kit, orient } from "../dsl";
import { LEGO_21368 } from "./index"; // read lazily (attach step index)

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
// Step 104 lays it against wall 1's +z end: its 1×10 plate's underside on the ten bracket studs
// that run up that end face (z 204), its length up wall 1's height, its studded face (+z) on
// wall 1's studded side (+x). wall2 LDU (x, y, z) → wall1 (z, −x, 204 − y).
const wall2: FrameDef = { id: "lw-wall2", label: "Lawn wall (second)", parent: "lw-wall1", position: [0, 0, 10.2], rotation: [Math.PI / 2, Math.PI / 2, 0], staging: { position: [0, 0, 16], rotation: [0, 0, 0] } };
Object.defineProperty(wall2, "attachStep", { enumerable: true, get: () => LEGO_21368.steps.findIndex((st) => (st.manualStep ?? 0) >= 104) });
lw.frame(wall2);
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
// 97 · two 1×1 plates stacked on each outer cell.
step(97, 74, [0, 9].flatMap((c) => [raw("3024", G, [cx(c), -80, 10]), raw("3024", G, [cx(c), -88, 10])]));
// 98 · 1×1×⅔ half-round plate with side stud on each inner cell, side stud facing +z (as tall as
// the two plates, so step 99's bricks lie level).
const HALF_PZ = orient([-1, 0, 0], UPV); // 3386: side stud (part −z) → +z
step(98, 74, [raw("3386", G, [cx(1), -88, 10], HALF_PZ), raw("3386", G, [cx(8), -88, 10], HALF_PZ)]);
// 99 · 1×2 brick on each tower.
step(99, 75, [raw("3004", G, [20, -112, 10]), raw("3004", G, [180, -112, 10])]);
// 100 · down-bracket on each outer cell (face over the end), 1×1 plate on each inner cell.
step(100, 75, [raw("79389", G, [cx(0), -120, 10], FACE_MX), raw("3024", G, [cx(1), -120, 10]), raw("79389", G, [cx(9), -120, 10], FACE_PX), raw("3024", G, [cx(8), -120, 10])]);
// 101 · 1×6×5 panel on the plate between the towers (cells 2–7); up-bracket on each outer cell,
// 1×1 plate on each inner cell, level with the panel's top.
step(101, 76, [
  raw("59349", G, [100, -128, 10], orient([-1, 0, 0], UPV)), // flat face toward +z
  raw("73825", G, [cx(0), -128, 10], FACE_MX), raw("3024", G, [cx(1), -128, 10]),
  raw("73825", G, [cx(9), -128, 10], FACE_PX), raw("3024", G, [cx(8), -128, 10]),
]);
// 102 · top course: side-stud bricks (facing +z) on the outer cells, two 1×4 bricks between.
step(102, 77, [
  raw("87087", G, [cx(0), -152, 10], HALF_PZ), raw("3010", G, [60, -152, 10]),
  raw("3010", G, [140, -152, 10]), raw("87087", G, [cx(9), -152, 10], HALF_PZ),
]);
// 103 · tiles: 1×2 on cells 0–1, 1×8 on cells 2–9.
step(103, 77, [raw("3069b", G, [20, -160, 10]), raw("4162", G, [120, -160, 10])]);

// 104 · wall 2 pressed onto wall 1's end (see the lw-wall2 frame); shown lying down.
lw.use("lw-wall1");
step(104, 78, [], "Lay both walls down and press the second wall's plate onto the first wall's end studs.");

// ── Third lawn wall (steps 105–109 so far): bricks along z, cell k 0 at the +z end (lower left).
lw.frame({ id: "lw-wall3", label: "Lawn wall (third)", position: [0, 0, -16], rotation: [0, 0, 0] });
lw.use("lw-wall3");
const kz = (k: number) => 190 - 20 * k; // centre of cell k
const kMid = (k0: number, k1: number) => (kz(k0) + kz(k1)) / 2;
// 105 · 1×6 brick (cells 4–9), 1×4 brick on its right end (cells 6–9).
step(105, 79, [raw("3009", G, [10, -24, kMid(4, 9)], ALONG_Z), raw("3010", G, [10, -48, kMid(6, 9)], ALONG_Z)]);
// 106 · 1×6 brick on the second course, cells 0–5 (overhanging the first course's left end).
step(106, 79, [raw("3009", G, [10, -48, kMid(0, 5)], ALONG_Z)]);
// 107 · under it: side-stud brick at cell 0 (stud facing +x), 1×3 brick at cells 1–3.
step(107, 80, [raw("87087", G, [10, -24, kz(0)], SIDE_PX), raw("3622", G, [10, -24, kMid(1, 3)], ALONG_Z)]);
// 108 · third course: 1×3 (cells 1–3), 1×6 (cells 4–9).
step(108, 80, [raw("3622", G, [10, -72, kMid(1, 3)], ALONG_Z), raw("3009", G, [10, -72, kMid(4, 9)], ALONG_Z)]);
// 109 · two 1×1 plates stacked on cell 0.
step(109, 81, [raw("3024", G, [10, -56, kz(0)]), raw("3024", G, [10, -64, kz(0)])]);
// TODO 110–127: step 110's curved 1×2 brick (5841) sits at the left end over cell 0 (top −64) and
// cell 1 (top −72), one plate apart; its seating is not yet resolved.
