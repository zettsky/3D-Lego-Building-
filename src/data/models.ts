/**
 * Hand-authored demonstration models. These are ORIGINAL Tsumiki designs (not LEGO sets),
 * so we can ship their instructions freely. Every model is checked by
 * `validateInstruction` in the test suite: no collisions, and after every step each brick
 * is connected (through studs) to the build mat.
 */
import type { BrickInstance, Rot } from "@/engine/assembly";
import type { Instruction, InstructionStep } from "@/engine/instructions";

function model(id: string, title: string, raw: { note: string; bricks: [string, string, number, number, number, Rot?][] }[]): Instruction {
  let n = 0;
  const steps: InstructionStep[] = raw.map((s) => ({
    note: s.note,
    bricks: s.bricks.map(([partId, colorId, x, y, z, rot]): BrickInstance => {
      n++;
      return { uid: `${id}-${String(n).padStart(3, "0")}`, partId, colorId, x, y, z, rot: rot ?? 0 };
    }),
  }));
  return { id, title, steps, provenance: "hand-authored" };
}

/** The Little Cottage — 50 pieces, 12 steps. Walls interlock course by course. */
export const COTTAGE = model("cottage", "The Little Cottage", [
  {
    note: "Lay out the garden: four 4 × 4 plates make an 8 × 8 lawn.",
    bricks: [
      ["3031", "bright-green", 0, 0, 0],
      ["3031", "bright-green", 4, 0, 0],
      ["3031", "bright-green", 0, 0, 4],
      ["3031", "bright-green", 4, 0, 4],
    ],
  },
  {
    note: "A smooth path to the door — tiles have no studs, so nothing sits on them.",
    bricks: [
      ["3069b", "tan", 3, 1, 0, 1],
      ["3069b", "tan", 4, 1, 0, 1],
    ],
  },
  {
    note: "First course, front wall. The sand-green bricks become the door.",
    bricks: [
      ["3622", "white", 0, 1, 2],
      ["3004", "sand-green", 3, 1, 2],
      ["3622", "white", 5, 1, 2],
    ],
  },
  {
    note: "Finish the first course: back wall and both sides.",
    bricks: [
      ["3010", "white", 0, 1, 7],
      ["3010", "white", 4, 1, 7],
      ["3010", "white", 0, 1, 3, 1],
      ["3010", "white", 7, 1, 3, 1],
    ],
  },
  {
    note: "Second course, front. Joints are offset from the course below so the wall locks together.",
    bricks: [
      ["3004", "white", 0, 4, 2],
      ["3005", "white", 2, 4, 2],
      ["3004", "sand-green", 3, 4, 2],
      ["3005", "white", 5, 4, 2],
      ["3004", "white", 6, 4, 2],
    ],
  },
  {
    note: "Second course, back and sides — leave room for a little blue window on the left.",
    bricks: [
      ["3004", "white", 0, 4, 7],
      ["3010", "white", 2, 4, 7],
      ["3004", "white", 6, 4, 7],
      ["3004", "white", 0, 4, 3, 1],
      ["3005", "medium-blue", 0, 4, 5],
      ["3005", "white", 0, 4, 6],
      ["3010", "white", 7, 4, 3, 1],
    ],
  },
  {
    note: "Third course. The long bricks over the door act as a lintel.",
    bricks: [
      ["3010", "white", 0, 7, 2],
      ["3010", "white", 4, 7, 2],
      ["3010", "white", 0, 7, 7],
      ["3010", "white", 4, 7, 7],
      ["3010", "white", 0, 7, 3, 1],
      ["3004", "white", 7, 7, 3, 1],
      ["3004", "white", 7, 7, 5, 1],
    ],
  },
  {
    note: "Gable bricks in the middle of each side wall will hold up the ridge.",
    bricks: [
      ["3004", "white", 0, 10, 4, 1],
      ["3004", "white", 7, 10, 4, 1],
    ],
  },
  {
    note: "Front roof: two rows of 45° slopes, the second row resting on the studs of the first.",
    bricks: [
      ["3037", "dark-orange", 0, 10, 2],
      ["3037", "dark-orange", 4, 10, 2],
      ["3037", "dark-orange", 0, 13, 3],
      ["3037", "dark-orange", 4, 13, 3],
    ],
  },
  {
    note: "Back roof — the same slopes turned around.",
    bricks: [
      ["3037", "dark-orange", 0, 10, 6, 2],
      ["3037", "dark-orange", 4, 10, 6, 2],
      ["3037", "dark-orange", 0, 13, 5, 2],
      ["3037", "dark-orange", 4, 13, 5, 2],
    ],
  },
  {
    note: "Ridge plates tie both roof halves together. Then a little chimney.",
    bricks: [
      ["3020", "reddish-brown", 0, 16, 4],
      ["3020", "reddish-brown", 4, 16, 4],
      ["3005", "dark-bluish-gray", 5, 17, 4],
      ["3005", "dark-bluish-gray", 5, 20, 4],
    ],
  },
  {
    note: "Garden bushes with a flower on top of each. Done — welcome home.",
    bricks: [
      ["3003", "dark-green", 0, 1, 0],
      ["3005", "dark-green", 6, 1, 0],
      ["3024", "yellow", 0, 4, 0],
      ["3024", "red", 6, 4, 0],
    ],
  },
]);

/** Sprout Pot — 17 pieces, 7 steps. A tiny potted plant, good for a first build. */
export const SPROUT = model("sprout", "Sprout Pot", [
  { note: "The pot base.", bricks: [["3031", "dark-orange", 0, 0, 0]] },
  {
    note: "First ring of the pot.",
    bricks: [
      ["3010", "dark-orange", 0, 1, 0],
      ["3010", "dark-orange", 0, 1, 3],
      ["3004", "dark-orange", 0, 1, 1, 1],
      ["3004", "dark-orange", 3, 1, 1, 1],
    ],
  },
  {
    note: "Second ring, laid as a pinwheel so every joint is bridged.",
    bricks: [
      ["3622", "dark-orange", 0, 4, 0, 1],
      ["3622", "dark-orange", 1, 4, 0],
      ["3622", "dark-orange", 3, 4, 1, 1],
      ["3622", "dark-orange", 0, 4, 3],
    ],
  },
  {
    note: "Fill the pot with soil.",
    bricks: [
      ["3003", "reddish-brown", 1, 1, 1],
      ["3003", "reddish-brown", 1, 4, 1],
    ],
  },
  {
    note: "A stem, two bricks tall.",
    bricks: [
      ["3005", "green", 1, 7, 1],
      ["3005", "green", 1, 10, 1],
    ],
  },
  {
    note: "The first leaf plate balances on the stem.",
    bricks: [["3020", "bright-green", 0, 13, 1]],
  },
  {
    note: "Two smaller leaves and a new bud on top.",
    bricks: [
      ["3022", "bright-green", 1, 14, 0],
      ["3023", "green", 2, 14, 2, 1],
      ["3024", "yellow", 1, 15, 1],
    ],
  },
]);

/** Tiny hero model for the landing page (assembles in the header). */
export const HERO_BRICKS: BrickInstance[] = [
  { uid: "h1", partId: "3001", colorId: "tan", x: 0, y: 0, z: 0, rot: 0 },
  { uid: "h2", partId: "3001", colorId: "white", x: 2, y: 3, z: 0, rot: 0 },
  { uid: "h3", partId: "3003", colorId: "sand-green", x: 0, y: 3, z: 0, rot: 0 },
  { uid: "h4", partId: "3039", colorId: "dark-orange", x: 2, y: 6, z: 0, rot: 0 },
  { uid: "h5", partId: "3004", colorId: "red", x: 0, y: 6, z: 1, rot: 0 },
  { uid: "h6", partId: "3024", colorId: "yellow", x: 1, y: 9, z: 1, rot: 0 },
];

export const MODELS: Record<string, Instruction> = { cottage: COTTAGE, sprout: SPROUT };
