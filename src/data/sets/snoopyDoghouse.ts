/**
 * LEGO® Ideas 21368 Peanuts: Snoopy's Doghouse — the doghouse build (bags 4–9, manual steps
 * 79–225), transcribed by reading the pictures of the official building instructions.
 *
 * What follows the manual:
 *  - the order of the steps, their numbers and pages, and the sub-builds (the lawn is built
 *    as sideways panels that are laid flat, the night-sky walls are built flat and stood up,
 *    the gables, ceiling, side walls and roof panels are built separately and attached);
 *  - the colours, taken from the parts list (Bright Red, Black, Dark Green, White,
 *    Medium/Dark Stone Grey);
 *  - the piece types in each step, wherever the engine has that part.
 *
 * What is a best reading rather than an exact copy: bricks that are hidden inside walls in
 * the pictures, a few dimensions adjusted so that every sub-assembly fits the others, and
 * small fittings the engine cannot represent yet (hinges, clips holding the roof). Steps
 * with such simplifications say so in their note.
 *
 * Not included: Snoopy, Woodstock, the typewriter and the campfire (steps 1–78 and 226+).
 *
 * The instruction manual itself is © The LEGO Group and is not redistributed here.
 */
import * as THREE from "three";
import type { BrickInstance, Rot } from "@/engine/assembly";
import type { FrameDef } from "@/engine/frames";
import type { Instruction, InstructionStep } from "@/engine/instructions";
import { PLATE, type Vec3 } from "@/engine/units";

// ── colours (LEGO names in comments) ────────────────────────────────────────
const RED = "red"; // Bright Red
const GREEN = "green"; // Dark Green
const BLACK = "black";
const WHITE = "white";
const GREY = "light-bluish-gray"; // Medium Stone Grey
const DGREY = "dark-bluish-gray"; // Dark Stone Grey
const LEAF = "bright-green";

// ── helpers ─────────────────────────────────────────────────────────────────
let n = 0;
const uid = () => `sd-${(++n).toString(36)}`;

interface Opt {
  anchor?: boolean;
}

function b(frame: string | undefined, partId: string, colorId: string, x: number, y: number, z: number, rot: Rot = 0, o: Opt = {}): BrickInstance {
  const out: BrickInstance = { uid: uid(), partId, colorId, x, y, z, rot };
  if (frame) out.frame = frame;
  if (o.anchor) out.anchor = true;
  return out;
}

const BRICK: Record<number, string> = { 1: "3005", 2: "3004", 3: "3622", 4: "3010", 6: "3009", 8: "3008", 10: "6111", 12: "6112" };
const PLATE_ID: Record<number, string> = { 1: "3024", 2: "3023", 3: "3623", 4: "3710", 6: "3666", 8: "3460", 10: "4477", 12: "60479" };
const TILE: Record<number, string> = { 1: "3070b", 2: "3069b", 3: "63864", 4: "2431", 6: "6636", 8: "4162" };

type Spec = number | "S" | "S-" | "S+";

/** A course of 1-wide bricks along +x. "S" = brick with a stud on the front (−z) face; "S-"/"S+" = stud facing −x/+x. */
function course(frame: string, color: string, x0: number, y: number, z: number, spec: Spec[]): BrickInstance[] {
  const out: BrickInstance[] = [];
  let x = x0;
  for (const s of spec) {
    if (typeof s === "number") {
      out.push(b(frame, BRICK[s], color, x, y, z));
      x += s;
    } else {
      out.push(b(frame, "87087", color, x, y, z, s === "S" ? 0 : s === "S-" ? 1 : 3));
      x += 1;
    }
  }
  return out;
}

function plateRow(frame: string, color: string, x0: number, y: number, z: number, lens: number[]): BrickInstance[] {
  const out: BrickInstance[] = [];
  let x = x0;
  for (const l of lens) {
    out.push(b(frame, PLATE_ID[l], color, x, y, z));
    x += l;
  }
  return out;
}

/** Rotation that sends the local axes to the given world axes, as an XYZ Euler. */
function basis(x: Vec3, y: Vec3, z: Vec3): Vec3 {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  const e = new THREE.Euler().setFromRotationMatrix(m, "XYZ");
  return [e.x, e.y, e.z];
}

const steps: InstructionStep[] = [];
const S = (manualStep: number, page: number, bricks: BrickInstance[], note?: string) => {
  const st: InstructionStep = { manualStep, page, bricks };
  if (note) st.note = note;
  steps.push(st);
};

// ── layout constants (scene units: 1 = one stud = 8 mm) ─────────────────────
const SLAB_A = 25; // plates, sideways panel A
const SLAB_B = 22; // plates, sideways panel B
const STRIP_W = 11 * PLATE; // 4.4 — the edge strips, laid flat
const SLAB_D = (SLAB_A + SLAB_B) * PLATE; // 18.8
const STRIP_L = 19;
const BASE_W = 10 + 2 * STRIP_W; // 18.8
/** Where the house's own grid origin lands on the lawn. */
const HOUSE: Vec3 = [3.4, 1, 5.5];
const ROOF_T = Math.atan(1.2); // 45° LEGO slope: one stud across, three plates up
const RIDGE_Y = 34.4 * PLATE; // underside of the roof at the ridge, house grid

// ════════════════════════════════════════════════════════════════════════════
// Bag 4 — the lawn (steps 79–127)
// Panel A is built upright, then laid flat; its front face becomes the grass.
// ════════════════════════════════════════════════════════════════════════════
const A = "lawn-a";
S(79, 64, [b(A, "4477", GREEN, 0, 0, 0), b(A, "87087", GREEN, 9, 1, 0, 3)]);
S(80, 65, [b(A, "87087", GREEN, 0, 1, 0, 1), b(A, "3004", GREEN, 1, 1, 0), b(A, "3009", GREEN, 3, 1, 0)]);
S(81, 65, [b(A, "36840", GREEN, 0, 4, 0, 1), b(A, "36840", GREEN, 9, 4, 0, 3)]);
S(82, 66, course(A, GREEN, 1, 4, 0, [6, 2]));
S(83, 66, course(A, GREEN, 1, 7, 0, [4, 4]));
S(84, 67, [b(A, "3024", GREEN, 0, 5, 0), b(A, "87087", GREEN, 0, 6, 0, 1), b(A, "3024", GREEN, 9, 5, 0), b(A, "87087", GREEN, 9, 6, 0, 3)]);
S(85, 67, [b(A, "36840", GREEN, 0, 9, 0, 1), b(A, "36840", GREEN, 9, 9, 0, 3)]);
S(86, 68, [b(A, "3004", DGREY, 1, 10, 0), b(A, "3010", GREEN, 3, 10, 0), b(A, "3004", DGREY, 7, 10, 0)], "The two grey pieces leave recessed slots in the lawn.");
S(87, 68, [
  b(A, "3024", GREEN, 0, 10, 0), b(A, "36840", GREEN, 0, 11, 0, 1), b(A, "3024", GREEN, 0, 12, 0),
  b(A, "3024", GREEN, 9, 10, 0), b(A, "36840", GREEN, 9, 11, 0, 3), b(A, "3024", GREEN, 9, 12, 0),
]);
S(88, 69, [b(A, "6111", GREEN, 0, 13, 0), b(A, "6111", GREEN, 0, 16, 0)]);
S(89, 69, [b(A, "36840", GREEN, 0, 19, 0, 1), b(A, "36840", GREEN, 9, 19, 0, 3)]);
S(90, 70, course(A, GREEN, 1, 19, 0, [2, 6]));
S(91, 70, [b(A, "3024", GREEN, 0, 20, 0), b(A, "36840", GREEN, 0, 21, 0, 1), b(A, "3024", GREEN, 9, 20, 0), b(A, "36840", GREEN, 9, 21, 0, 3)]);
S(92, 71, course(A, GREEN, 0, 22, 0, [2, "S", 3, 4]));

// Panel B (steps 93–103), joined to panel A in step 104.
const B = "lawn-b";
S(93, 72, [b(B, "4477", GREEN, 0, 0, 0), b(B, "3004", GREEN, 0, 1, 0), b(B, "3004", GREEN, 8, 1, 0)]);
S(94, 72, [b(B, "36840", GREEN, 0, 4, 0, 1), b(B, "3024", GREEN, 1, 4, 0), b(B, "3024", GREEN, 8, 4, 0), b(B, "36840", GREEN, 9, 4, 0, 3)]);
S(95, 73, [b(B, "36840", GREEN, 0, 5, 0, 1), b(B, "3024", GREEN, 1, 5, 0), b(B, "3024", GREEN, 8, 5, 0), b(B, "36840", GREEN, 9, 5, 0, 3)]);
S(96, 73, [b(B, "3004", GREEN, 0, 6, 0), b(B, "3004", GREEN, 8, 6, 0)]);
S(97, 74, [0, 1, 8, 9].map((x) => b(B, "3024", GREEN, x, 9, 0)));
S(98, 74, [b(B, "87087", GREEN, 1, 10, 0), b(B, "87087", GREEN, 8, 10, 0)]);
S(99, 75, [b(B, "3004", GREEN, 0, 13, 0), b(B, "3004", GREEN, 8, 13, 0)]);
S(100, 75, [b(B, "36840", GREEN, 0, 16, 0, 1), b(B, "3024", GREEN, 1, 16, 0), b(B, "3024", GREEN, 8, 16, 0), b(B, "36840", GREEN, 9, 16, 0, 3)]);
S(101, 76, [
  b(B, "36840", GREEN, 0, 17, 0, 1), b(B, "3024", GREEN, 1, 17, 0), b(B, "3024", GREEN, 8, 17, 0), b(B, "36840", GREEN, 9, 17, 0, 3),
  b(B, "59349", GREEN, 2, 1, 0),
]);
S(102, 77, course(B, GREEN, 0, 18, 0, ["S-", 4, 4, "S+"]));
S(103, 77, [b(B, "3069b", GREEN, 0, 21, 0), b(B, "4162", GREEN, 2, 21, 0)]);
S(104, 78, [], "Turn both panels so their faces point up, and push panel B onto the top of panel A.");

// Edge strip 1 (steps 105–114)
function stripCourses(F: string): BrickInstance[][] {
  return [
    course(F, GREEN, 0, 0, 0, [4, "S", 6, 4, "S", 3]),
    course(F, GREEN, 0, 3, 0, [6, 4, "S", 6, 2]),
    course(F, GREEN, 0, 6, 0, [2, "S", 4, 6, 4, "S", 1]),
    plateRow(F, GREEN, 0, 9, 0, [10, 2, 6, 1]),
    [
      b(F, "11477", GREEN, 0, 10, 0, 1),
      b(F, "4162", GREEN, 2, 10, 0),
      b(F, "15573", GREEN, 10, 10, 0),
      b(F, "2431", GREEN, 12, 10, 0),
      b(F, "3070b", GREEN, 16, 10, 0),
      b(F, "11477", GREEN, 17, 10, 0, 3),
    ],
  ];
}
const L = "strip-1";
const s1 = stripCourses(L);
S(105, 79, s1[0].slice(0, 3));
S(106, 79, s1[0].slice(3));
S(107, 80, s1[1].slice(0, 3));
S(108, 80, s1[1].slice(3));
S(109, 81, s1[2].slice(0, 4));
S(110, 81, [...s1[2].slice(4), ...s1[3].slice(0, 2)]);
S(111, 82, s1[3].slice(2), "The manual adds a small sideways sub-build here; it is represented by plain plates.");
S(112, 84, [s1[4][0], s1[4][5]]);
S(113, 87, s1[4].slice(1, 5));
S(114, 88, [], "Attach the strip along one side of the lawn.");

// Edge strip 2 (steps 115–126)
const R = "strip-2";
const s2 = stripCourses(R);
S(115, 89, s2[0].slice(0, 2));
S(116, 89, s2[0].slice(2, 4));
S(117, 90, s2[0].slice(4));
S(118, 90, s2[1].slice(0, 2));
S(119, 91, s2[1].slice(2, 4));
S(120, 91, s2[1].slice(4));
S(121, 92, s2[2].slice(0, 4));
S(122, 92, s2[2].slice(4));
S(123, 93, s2[3]);
S(124, 93, [s2[4][0], s2[4][5]], "Curved pieces round off the corners.");
S(125, 94, s2[4].slice(1, 5));
S(126, 95, [], "Attach the second strip along the other side.");

// ════════════════════════════════════════════════════════════════════════════
// Bag 5 — the night-sky walls (steps 128–162), built flat and stood up inside the house
// ════════════════════════════════════════════════════════════════════════════
const SB = "sky-back";
S(128, 97, [b(SB, "3030", BLACK, 0, 0, 0)]);
S(129, 98, [b(SB, "3020", WHITE, 0, 0, 4, 1), b(SB, "3032", BLACK, 2, 0, 4)]);
S(130, 98, [b(SB, "3020", WHITE, 8, 0, 4, 1)]);
S(131, 99, [b(SB, "3030", BLACK, 0, 1, 0)]);
S(132, 99, [b(SB, "3030", BLACK, 0, 1, 4)]);
S(134, 100, [b(SB, "15712", BLACK, 0, 2, 1, 1), b(SB, "15712", BLACK, 0, 2, 6, 1), b(SB, "15712", BLACK, 9, 2, 1, 3), b(SB, "15712", BLACK, 9, 2, 6, 3)], "Clips that hold the side walls (the hinge itself is not modelled).");
S(139, 103, [
  [2, 1], [4, 2], [6, 1], [7, 4], [3, 5], [8, 6],
].map(([x, z]) => b(SB, "98138", WHITE, x, 2, z)), "Six white round tiles: the stars.");
S(140, 104, [], "Stand the night sky up at the back of the lawn.");

const SL = "sky-left";
const SR = "sky-right";
S(141, 105, [b(SL, "3032", BLACK, 0, 0, 0, 1)]);
S(145, 107, [b(SL, "3020", BLACK, 0, 0, 6), b(SL, "3032", BLACK, 0, 1, 0, 1)]);
S(146, 107, [b(SL, "3020", BLACK, 0, 1, 6)], "The manual rounds the top corner with a quarter-circle plate; shown square here.");
S(150, 109, [b(SL, "98138", WHITE, 2, 2, 2), b(SL, "98138", WHITE, 1, 2, 5)]);
S(151, 110, [], "Attach the left wall.");
S(152, 111, [b(SR, "3032", BLACK, 0, 0, 0, 1)]);
S(156, 113, [b(SR, "3020", BLACK, 0, 0, 6), b(SR, "3032", BLACK, 0, 1, 0, 1)]);
S(157, 113, [b(SR, "3020", BLACK, 0, 1, 6)], "Quarter-circle corner shown square, as on the left wall.");
S(161, 115, [b(SR, "98138", WHITE, 0, 2, 2), b(SR, "98138", WHITE, 1, 2, 5)]);
S(162, 116, [], "Attach the right wall.");

// ════════════════════════════════════════════════════════════════════════════
// Bags 6–9 — the red doghouse (steps 163–225)
// House grid: x 0–11 across the gables, z 0 (front) – 11 (back), y in plates from the floor.
// ════════════════════════════════════════════════════════════════════════════
const H = "house";
const Z_BACK = 11;
// Back gable wall (163–171)
S(163, 117, [b(H, "60479", RED, 0, 0, Z_BACK), b(H, "23969", RED, 5, 1, Z_BACK)]);
S(164, 118, [b(H, "60581", RED, 1, 1, Z_BACK), b(H, "60581", RED, 7, 1, Z_BACK)]);
S(165, 118, [
  b(H, "87087", RED, 0, 1, Z_BACK, 1), b(H, "32952", RED, 0, 4, Z_BACK, 1), b(H, "3024", RED, 0, 9, Z_BACK),
  b(H, "87087", RED, 11, 1, Z_BACK, 3), b(H, "32952", RED, 11, 4, Z_BACK, 3), b(H, "3024", RED, 11, 9, Z_BACK),
]);
S(166, 119, [b(H, "60479", RED, 0, 10, Z_BACK)]);
S(167, 120, [b(H, "14716", RED, 3, 11, Z_BACK), b(H, "60581", RED, 4, 11, Z_BACK), b(H, "14716", RED, 8, 11, Z_BACK)]);
S(168, 120, [b(H, "3004", RED, 0, 11, Z_BACK), b(H, "87087", RED, 2, 11, Z_BACK), b(H, "87087", RED, 9, 11, Z_BACK), b(H, "3004", RED, 10, 11, Z_BACK)]);
S(169, 121, [b(H, "3623", RED, 0, 14, Z_BACK), b(H, "3623", RED, 9, 14, Z_BACK)]);
S(170, 122, [b(H, "3040", RED, 1, 15, Z_BACK, 1), b(H, "3040", RED, 9, 15, Z_BACK, 3), b(H, "54200", RED, 0, 15, Z_BACK, 1), b(H, "54200", RED, 11, 15, Z_BACK, 3)]);
S(171, 122, [b(H, "3024", RED, 2, 18, Z_BACK), b(H, "3024", RED, 9, 18, Z_BACK), b(H, "54200", RED, 2, 19, Z_BACK, 1), b(H, "54200", RED, 9, 19, Z_BACK, 3)]);

// Ceiling (172–178): rests on the top of both gables and carries the roof clips.
const C = "ceiling";
S(172, 123, [b(C, "3020", BLACK, 5, 20, 4, 1, { anchor: true }), b(C, "3022", WHITE, 5, 21, 5)]);
S(173, 123, [
  b(C, "60479", RED, 3, 20, 0, 1, { anchor: true }), b(C, "60479", RED, 8, 20, 0, 1, { anchor: true }),
  b(C, "15712", GREY, 3, 21, 2, 1), b(C, "15712", GREY, 3, 21, 9, 1), b(C, "15712", GREY, 8, 21, 2, 3), b(C, "15712", GREY, 8, 21, 9, 3),
]);
S(174, 124, [
  b(C, "2420", RED, 4, 20, 0, 0, { anchor: true }), b(C, "2420", RED, 6, 20, 0, 3, { anchor: true }),
  b(C, "2420", RED, 4, 20, 10, 1, { anchor: true }), b(C, "2420", RED, 6, 20, 10, 2, { anchor: true }),
  b(C, "3023", RED, 5, 20, 2, 1, { anchor: true }), b(C, "3023", RED, 6, 20, 2, 1, { anchor: true }),
  b(C, "3023", RED, 5, 20, 8, 1, { anchor: true }), b(C, "3023", RED, 6, 20, 8, 1, { anchor: true }),
]);
S(175, 125, [b(C, "3460", RED, 4, 20, 2, 1, { anchor: true }), b(C, "3460", RED, 7, 20, 2, 1, { anchor: true })]);
S(176, 126, [b(C, "3024", RED, 5, 21, 2), b(C, "3024", RED, 6, 21, 2), b(C, "3024", RED, 5, 21, 9), b(C, "3024", RED, 6, 21, 9)]);
S(177, 126, [3, 5, 7, 9].flatMap((z) => [b(C, "4073", DGREY, 4, 21, z), b(C, "4073", DGREY, 7, 21, z)]), "Round plates that the roof panels rest on.");
S(178, 127, [], "Put the ceiling on top of the back gable.");

// Front facade with the doorway (179–193)
const F = "front";
S(179, 128, [b(F, "3004", RED, 1, 6, 0, 0, { anchor: true }), b(F, "3023", RED, 1, 9, 0)]);
S(180, 128, [b(F, "13965", RED, 3, 6, 0, 0, { anchor: true })]);
S(181, 129, [b(F, "3004", RED, 1, 10, 0)]);
S(182, 129, [b(F, "3023", RED, 1, 13, 0), b(F, "3023", RED, 1, 14, 0)]);
S(183, 129, [b(F, "3710", RED, 2, 15, 0)]);
S(184, 130, [
  b(F, "3004", RED, 9, 6, 0, 0, { anchor: true }), b(F, "3023", RED, 9, 9, 0), b(F, "13965", RED, 6, 6, 0, 2, { anchor: true }),
  b(F, "3004", RED, 9, 10, 0), b(F, "3023", RED, 9, 13, 0), b(F, "3023", RED, 9, 14, 0),
]);
S(185, 131, [b(F, "3710", RED, 6, 15, 0)]);
S(186, 132, [
  b(F, "87087", RED, 0, 6, 0, 1, { anchor: true }), b(F, "32952", RED, 0, 9, 0, 1), b(F, "3024", RED, 0, 14, 0), b(F, "3024", RED, 0, 15, 0),
  b(F, "87087", RED, 11, 6, 0, 3, { anchor: true }), b(F, "32952", RED, 11, 9, 0, 3), b(F, "3024", RED, 11, 14, 0), b(F, "3024", RED, 11, 15, 0),
  b(F, "3024", RED, 1, 15, 0), b(F, "3024", RED, 10, 15, 0),
]);
S(187, 133, [b(F, "3009", BLACK, 3, 16, 0), b(F, "3666", BLACK, 3, 19, 0)], "Dark backing for the name sign (the manual's sideways bracket sub-build is simplified).");
S(188, 134, [b(F, "3040", RED, 1, 16, 0, 1), b(F, "3040", RED, 9, 16, 0, 3), b(F, "3024", RED, 2, 19, 0), b(F, "3024", RED, 9, 19, 0)]);
S(189, 134, [b(F, "54200", RED, 0, 16, 0, 1), b(F, "54200", RED, 11, 16, 0, 3)]);
S(190, 135, [b(F, "54200", RED, 2, 20, 0, 1), b(F, "54200", RED, 9, 20, 0, 3)]);
const SIGN = "sign";
S(192, 136, [b(SIGN, "3795", GREY, 0, 0, 0, 0, { anchor: true }), b(SIGN, "69729p01", RED, 0, 1, 0)], "The printed SNOOPY tile goes on sideways, above the door.");
S(193, 137, [], "Attach the front to the ceiling.");

// Gable tops (194–196), on the ceiling at both ends
const apex = (z: number) => [b(C, "3040", RED, 3, 21, z, 1), b(C, "3040", RED, 7, 21, z, 3)];
S(194, 138, [...apex(0), ...apex(11)]);
const apex2 = (z: number) => [b(C, "3710", RED, 4, 24, z), b(C, "3040", RED, 4, 25, z, 1), b(C, "3040", RED, 6, 25, z, 3), b(C, "3044", RED, 5, 28, z)];
S(196, 140, [...apex2(0), ...apex2(11)]);

// Side walls (197) and front legs (198)
function sideWall(W: string): BrickInstance[] {
  return [
    b(W, "60479", RED, 0, 0, 0), b(W, "60479", RED, 0, 1, 0),
    b(W, "60581", RED, 1, 2, 0), b(W, "23969", RED, 5, 2, 0), b(W, "60581", RED, 7, 2, 0),
    b(W, "87087", RED, 0, 2, 0, 1), b(W, "32952", RED, 0, 5, 0, 1), b(W, "3024", RED, 0, 10, 0),
    b(W, "87087", RED, 11, 2, 0, 3), b(W, "32952", RED, 11, 5, 0, 3), b(W, "3024", RED, 11, 10, 0),
  ];
}
S(197, 141, [...sideWall("wall-left"), ...sideWall("wall-right")], "Build two side walls and hang them from the gables.");
const P = "legs";
const leg = (x: number, wide: number) => [
  b(P, "3245c", RED, wide, 0, 0),
  b(P, "3023", RED, x, 0, 0), b(P, "3004", RED, x, 1, 0), b(P, "3023", RED, x, 4, 0), b(P, "3023", RED, x, 5, 0),
];
S(198, 144, [...leg(2, 0), ...leg(8, 10)], "Two legs under the front, either side of the doorway.");

// Roof panels (199–220): plates in two layers, tiles on top like shingles.
function roofPanel(Rf: string): { plates: BrickInstance[]; plates2: BrickInstance[]; tiles: BrickInstance[] } {
  const plates: BrickInstance[] = [];
  for (const x of [0, 2, 4, 6, 8]) plates.push(b(Rf, "2445", RED, x, 0, 0, 1), b(Rf, "3022", RED, x, 0, 12));
  plates.push(b(Rf, "4477", RED, 10, 0, 0, 1), b(Rf, "3710", RED, 10, 0, 10, 1));
  const plates2: BrickInstance[] = [];
  for (const z of [0, 2, 4, 6, 8, 10, 12]) plates2.push(b(Rf, "3832", RED, 0, 1, z));
  plates2.push(b(Rf, "60479", RED, 10, 1, 0, 1), b(Rf, "3023", RED, 10, 1, 12, 1));
  const tiles: BrickInstance[] = [];
  const rowA: [string, number][] = [["69729", 6], ["69729", 6], ["3068b", 2]];
  const rowB: [string, number][] = [["87079", 4], ["69729", 6], ["87079", 4]];
  [rowA, rowB, rowA, rowB, rowA].forEach((row, i) => {
    let z = 0;
    for (const [id, len] of row) {
      tiles.push(b(Rf, id, RED, i * 2, 2, z, 1));
      z += len;
    }
  });
  let z = 0;
  for (const len of [8, 4, 2]) {
    tiles.push(b(Rf, TILE[len], RED, 10, 2, z, 1));
    z += len;
  }
  return { plates, plates2, tiles };
}
const RL = "roof-left";
const RR = "roof-right";
const r1 = roofPanel(RL);
const r2 = roofPanel(RR);
S(199, 147, r1.plates.slice(0, 6));
S(201, 148, r1.plates.slice(6));
S(202, 149, r1.plates2.slice(0, 4));
S(203, 151, r1.plates2.slice(4));
S(205, 153, r1.tiles.slice(0, 9), "First roof panel: tiles laid like shingles.");
S(206, 154, r1.tiles.slice(9));
S(210, 157, r2.plates.slice(0, 6));
S(212, 159, r2.plates.slice(6));
S(213, 160, r2.plates2.slice(0, 4));
S(216, 163, r2.plates2.slice(4));
S(219, 167, r2.tiles.slice(0, 9));
S(220, 168, r2.tiles.slice(9));
S(223, 171, [], "Clip both roof panels onto the house (the hinges are not modelled; the panels are placed at the manual's angle).");
// Ridge cap: resting on the upper edges of the two panels (three plates thick, tilted).
const RIDGE = Math.floor((RIDGE_Y + 3 * PLATE * Math.cos(ROOF_T)) / PLATE);
S(224, 172, [
  b(H, "2445", RED, 5, RIDGE, 0, 1, { anchor: true }),
  b(H, "54200", RED, 5, RIDGE, -1, 0, { anchor: true }), b(H, "54200", RED, 6, RIDGE, -1, 0, { anchor: true }),
  b(H, "54200", RED, 5, RIDGE, 12, 2, { anchor: true }), b(H, "54200", RED, 6, RIDGE, 12, 2, { anchor: true }),
], "Ridge cap along the top.");
S(225, 174, [], "Lower the finished house over the night-sky walls onto the lawn.");

// Grass tufts (127), placed on studs that point up out of the lawn.
const GRASS = "grass";
const grassSpots: [number, number][] = [
  [1.5, 2.5], [3.5, 1.5], [16.5, 3.5], [17.5, 12.5], [1.5, 15.5], [12.5, 2.5],
];
const stepGrass: InstructionStep = {
  manualStep: 127,
  page: 96,
  bricks: grassSpots.map(([x, z]) => b(GRASS, "grass", LEAF, x - 0.5, 0, z - 0.5, 0, { anchor: true })),
  note: "Six grass tufts.",
};
steps.splice(steps.findIndex((s) => s.manualStep === 128), 0, stepGrass);

// ── sub-assembly transforms ─────────────────────────────────────────────────
const at = (manualStep: number) => {
  const i = steps.findIndex((s) => s.manualStep === manualStep);
  if (i < 0) throw new Error(`No step ${manualStep}`);
  return i;
};
const c = Math.cos(ROOF_T);
const s = Math.sin(ROOF_T);
const SKY_W = 10; // night sky back panel width (studs)
const SKY_T = 2 * PLATE;
const skyX0 = HOUSE[0] + 1;
const skyBackZ = HOUSE[2] + Z_BACK;

const frames: FrameDef[] = [
  {
    id: A, label: "Lawn panel A",
    position: [STRIP_W, 1, (STRIP_L - SLAB_D) / 2], rotation: basis([1, 0, 0], [0, 0, 1], [0, -1, 0]),
    staging: { position: [STRIP_W, 0, -5], rotation: [0, 0, 0] }, attachStep: at(104),
  },
  {
    id: B, label: "Lawn panel B", parent: A,
    position: [0, SLAB_A * PLATE, 0], rotation: [0, 0, 0],
    staging: { position: [12, 0, 0], rotation: [0, 0, 0] }, attachStep: at(104),
  },
  {
    id: L, label: "Edge strip 1",
    position: [STRIP_W, 1, 0], rotation: basis([0, 0, 1], [-1, 0, 0], [0, -1, 0]),
    staging: { position: [-3, 0, 0], rotation: [0, -Math.PI / 2, 0] }, attachStep: at(114),
  },
  {
    id: R, label: "Edge strip 2",
    position: [BASE_W - STRIP_W, 1, STRIP_L], rotation: basis([0, 0, -1], [1, 0, 0], [0, -1, 0]),
    staging: { position: [BASE_W + 3, 0, STRIP_L], rotation: [0, Math.PI / 2, 0] }, attachStep: at(126),
  },
  { id: GRASS, label: "Grass", position: [0, 1, 0], rotation: [0, 0, 0] },
  {
    id: SB, label: "Night sky (back)",
    position: [skyX0, 1, skyBackZ], rotation: basis([1, 0, 0], [0, 0, -1], [0, 1, 0]),
    staging: { position: [BASE_W + 4, 0, -10], rotation: [0, 0, 0] }, attachStep: at(140),
  },
  {
    id: SL, label: "Night sky (left)",
    position: [skyX0, 1, skyBackZ - SKY_T - 4], rotation: basis([0, 0, 1], [1, 0, 0], [0, 1, 0]),
    staging: { position: [BASE_W + 4, 0, -16], rotation: [0, 0, 0] }, attachStep: at(151),
  },
  {
    id: SR, label: "Night sky (right)",
    position: [skyX0 + SKY_W, 1, skyBackZ - SKY_T], rotation: basis([0, 0, -1], [-1, 0, 0], [0, 1, 0]),
    staging: { position: [BASE_W + 10, 0, -16], rotation: [0, 0, 0] }, attachStep: at(162),
  },
  {
    id: H, label: "Doghouse",
    position: HOUSE, rotation: [0, 0, 0],
    staging: { position: [BASE_W + 10, 0, 6], rotation: [0, 0, 0] }, attachStep: at(225),
  },
  { id: C, label: "Ceiling", parent: H, position: [0, 0, 0], rotation: [0, 0, 0], staging: { position: [0, -20 * PLATE, -16], rotation: [0, 0, 0] }, attachStep: at(178) },
  { id: F, label: "Front", parent: H, position: [0, 0, 0], rotation: [0, 0, 0], staging: { position: [0, -6 * PLATE, -8], rotation: [0, 0, 0] }, attachStep: at(193) },
  {
    id: SIGN, label: "Name sign", parent: F,
    // Tile face toward the viewer, text upright: local x runs right-to-left in world x.
    position: [9, 21 * PLATE, 0], rotation: basis([-1, 0, 0], [0, 0, -1], [0, -1, 0]),
    staging: { position: [3, 2, -6], rotation: [0, 0, 0] }, attachStep: at(192) + 1,
  },
  {
    id: "wall-left", label: "Left wall", parent: H,
    position: [0, 0, 0], rotation: [0, -Math.PI / 2, 0],
    staging: { position: [-8, 0, 0], rotation: [0, -Math.PI / 2, 0] }, attachStep: at(197) + 1,
  },
  {
    id: "wall-right", label: "Right wall", parent: H,
    position: [12, 0, 12], rotation: [0, Math.PI / 2, 0],
    staging: { position: [20, 0, 12], rotation: [0, Math.PI / 2, 0] }, attachStep: at(197) + 1,
  },
  { id: P, label: "Front legs", parent: H, position: [0, 0, 0], rotation: [0, 0, 0], staging: { position: [0, 0, -6], rotation: [0, 0, 0] }, attachStep: at(198) + 1 },
  {
    id: RL, label: "Roof (left)", parent: H,
    position: [6, RIDGE_Y, 13], rotation: basis([-c, -s, 0], [-s, c, 0], [0, 0, -1]),
    staging: { position: [-16, 0, 0], rotation: [0, 0, 0] }, attachStep: at(223),
  },
  {
    id: RR, label: "Roof (right)", parent: H,
    position: [6, RIDGE_Y, -1], rotation: basis([c, -s, 0], [s, c, 0], [0, 0, 1]),
    staging: { position: [-16, 0, -18], rotation: [0, 0, 0] }, attachStep: at(223),
  },
];

export const SNOOPY_DOGHOUSE: Instruction = {
  id: "lego-21368-doghouse",
  title: "Snoopy's Doghouse — the doghouse (steps 79–225)",
  provenance: "manual-transcription",
  steps,
  frames,
};

/** Facts for the set page. */
export const SNOOPY_DOGHOUSE_NOTES = {
  manualSteps: "79–225 (bags 4–9)",
  notIncluded: "Snoopy, Woodstock, the typewriter and the campfire (steps 1–78 and 226 onward).",
};
