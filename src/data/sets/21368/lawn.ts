/**
 * 21368 — the lawn (bag 4) (manual steps 79–127, pages 64–96).
 * See docs/TRANSCRIBING.md for conventions. Coordinates: the manual's camera (+x lower right,
 * +z lower left, y up); `raw` positions in LDU with LDraw's −y up.
 */
import { kit, orient } from "../dsl";

export const lw = kit("lw");
const { raw, step } = lw;

const G = "green";
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
