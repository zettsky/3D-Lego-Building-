import { describe, expect, it } from "vitest";
import { cellsOf, footprint, sceneBounds, validateAssembly, type BrickInstance } from "./assembly";
import { getPart } from "./parts";
import { assemblyAt, allBricks, instructionInventory, validateInstruction } from "./instructions";
import { remainingCounts, invKey } from "./inventory";
import { snapCandidate } from "./snapping";
import { initStudio, studioReducer, visibleBricks, type StudioAction, type StudioState } from "./studio";
import { ghostVisible, guidedReducer, initGuided } from "./guidedMachine";
import { exportLDraw, importLDraw } from "./ldraw";
import { explodeVectors } from "./explode";
import { remainingEstimate } from "./estimate";
import { COTTAGE, HERO_BRICKS, MODELS, SPROUT } from "@/data/models";
import { CATALOG } from "@/data/catalog";
import { PLATE } from "./units";

const B = (uid: string, partId: string, x: number, y: number, z: number, rot: 0 | 1 | 2 | 3 = 0): BrickInstance => ({
  uid, partId, colorId: "white", x, y, z, rot,
});

describe("geometry & coordinates", () => {
  it("rotated footprints cover the right cells", () => {
    const b = B("a", "3001", 2, 0, 3, 1); // 2x4 turned: 2 wide in x, 4 deep in z
    const cells = cellsOf(b);
    const xs = cells.map((c) => c.x), zs = cells.map((c) => c.z);
    expect(Math.min(...xs)).toBe(2);
    expect(Math.max(...xs)).toBe(3);
    expect(Math.min(...zs)).toBe(3);
    expect(Math.max(...zs)).toBe(6);
    expect(new Set(cells.map((c) => `${c.x},${c.z}`)).size).toBe(8);
  });

  it("every rotation of every part stays inside its footprint box", () => {
    for (const id of ["3001", "3622", "3037", "3040", "3069b"]) {
      for (const rot of [0, 1, 2, 3] as const) {
        const b = B("p", id, 5, 0, 5, rot);
        const { fw, fd } = footprint(getPart(id), rot);
        for (const c of cellsOf(b)) {
          expect(c.x).toBeGreaterThanOrEqual(5);
          expect(c.x).toBeLessThan(5 + fw);
          expect(c.z).toBeGreaterThanOrEqual(5);
          expect(c.z).toBeLessThan(5 + fd);
        }
      }
    }
  });

  it("detects collisions and floating bricks", () => {
    const issues = validateAssembly([B("a", "3001", 0, 0, 0), B("b", "3003", 1, 1, 0), B("c", "3005", 9, 6, 9)]);
    expect(issues.some((i) => i.kind === "collision" && i.uid === "b")).toBe(true);
    expect(issues.some((i) => i.kind === "floating" && i.uid === "c")).toBe(true);
  });

  it("bricks resting only on a tile are not connected", () => {
    const issues = validateAssembly([B("t", "3068b", 0, 0, 0), B("x", "3003", 0, 1, 0)]);
    expect(issues.some((i) => i.kind === "floating" && i.uid === "x")).toBe(true);
  });
});

describe("demonstration models are geometrically valid", () => {
  for (const instr of Object.values(MODELS)) {
    it(`${instr.title}: no collisions, every step fully connected`, () => {
      expect(validateInstruction(instr)).toEqual([]);
    });
  }
  it("hero model is valid", () => expect(validateAssembly(HERO_BRICKS)).toEqual([]));
  it("piece counts match the catalog", () => {
    expect(allBricks(COTTAGE)).toHaveLength(50);
    expect(allBricks(SPROUT)).toHaveLength(17);
    expect(CATALOG.find((s) => s.id === "tsumiki-cottage")!.pieces).toBe(50);
  });
});

describe("snapping", () => {
  const bounds = { minX: 0, minZ: 0, maxX: 16, maxZ: 16 };
  it("drops onto the highest surface under the footprint", () => {
    const c = snapCandidate([B("a", "3001", 0, 0, 0)], "3003", "red", 0, { x: 1, z: 1 }, bounds);
    expect(c.valid).toBe(true);
    expect(c.brick.y).toBe(3);
    expect(c.connectsTo).toEqual(["a"]);
  });
  it("refuses to stack on a tile", () => {
    const c = snapCandidate([B("t", "3068b", 0, 0, 0)], "3003", "red", 0, { x: 0, z: 0 }, bounds);
    expect(c.valid).toBe(false);
  });
  it("keeps the ghost on the plate at the edges", () => {
    const c = snapCandidate([], "3001", "red", 0, { x: 15, z: 15 }, bounds);
    expect(c.valid).toBe(true);
    expect(c.brick.x).toBe(12);
  });
});

describe("custom build reducer", () => {
  const inventory = [{ partId: "3001", colorId: "white", qty: 2 }, { partId: "3003", colorId: "red", qty: 1 }];
  const bounds = { minX: 0, minZ: 0, maxX: 16, maxZ: 16 };
  const run = (s: StudioState, ...as: StudioAction[]) => as.reduce(studioReducer, s);

  it("tracks inventory and never exceeds it", () => {
    let s = initStudio(inventory, bounds);
    s = run(s, { type: "PICK_PART", partId: "3001", colorId: "white" }, { type: "PLACE", anchor: { x: 2, z: 2 } }, { type: "PLACE", anchor: { x: 8, z: 8 } });
    expect(s.history.present).toHaveLength(2);
    expect(remainingCounts(inventory, s.history.present).get(invKey("3001", "white"))).toBe(0);
    expect(s.active).toBeNull(); // auto-deselected when exhausted
    s = run(s, { type: "PICK_PART", partId: "3001", colorId: "white" });
    expect(s.active).toBeNull();
    expect(s.message).toMatch(/None/);
  });

  it("undo/redo restores geometry and inventory together", () => {
    let s = initStudio(inventory, bounds);
    s = run(s, { type: "PICK_PART", partId: "3003", colorId: "red" }, { type: "PLACE", anchor: { x: 1, z: 1 } });
    expect(remainingCounts(inventory, s.history.present).get(invKey("3003", "red"))).toBe(0);
    s = run(s, { type: "UNDO" });
    expect(remainingCounts(inventory, s.history.present).get(invKey("3003", "red"))).toBe(1);
    s = run(s, { type: "REDO" });
    expect(s.history.present).toHaveLength(1);
  });

  it("will not delete a brick that others depend on", () => {
    let s = initStudio(inventory, bounds);
    s = run(s, { type: "PICK_PART", partId: "3001", colorId: "white" }, { type: "PLACE", anchor: { x: 2, z: 2 } }, { type: "PLACE", anchor: { x: 2, z: 2 } });
    const bottom = s.history.present.find((b) => b.y === 0)!;
    s = run(s, { type: "SELECT", uid: bottom.uid }, { type: "DELETE" });
    expect(s.history.present).toHaveLength(2);
    expect(s.message).toMatch(/rest on/);
  });

  it("moving keeps inventory constant and commits as one undo step", () => {
    let s = initStudio(inventory, bounds);
    s = run(s, { type: "PICK_PART", partId: "3003", colorId: "red" }, { type: "PLACE", anchor: { x: 1, z: 1 } });
    const uid = s.history.present[0].uid;
    s = run(s, { type: "SELECT", uid }, { type: "MOVE" });
    expect(visibleBricks(s)).toHaveLength(0);
    s = run(s, { type: "PLACE", anchor: { x: 10, z: 10 } });
    expect(s.history.present).toHaveLength(1);
    expect(s.history.present[0].uid).toBe(uid);
    expect(s.history.present[0].x).toBe(10);
    s = run(s, { type: "UNDO" });
    expect(s.history.present[0].x).toBe(1);
  });

  it("duplicate consumes inventory and lands on top", () => {
    let s = initStudio(inventory, bounds);
    s = run(s, { type: "PICK_PART", partId: "3001", colorId: "white" }, { type: "PLACE", anchor: { x: 4, z: 4 } });
    const uid = s.history.present[0].uid;
    s = run(s, { type: "SELECT", uid }, { type: "DUPLICATE" });
    expect(s.history.present).toHaveLength(2);
    expect(s.history.present[1].y).toBe(3);
    s = run(s, { type: "DUPLICATE" });
    expect(s.history.present).toHaveLength(2); // out of 2x4s
  });
});

describe("guided state machine", () => {
  it("exploded view hides ghosts and restores them on exit", () => {
    let s = initGuided(5, 0, true);
    s = guidedReducer(s, { type: "ANIM_DONE", token: s.animToken });
    expect(ghostVisible(s)).toBe(true);
    s = guidedReducer(s, { type: "TOGGLE_EXPLODE" });
    expect(ghostVisible(s)).toBe(false);
    expect(s.ghostPref).toBe(true);
    s = guidedReducer(s, { type: "TOGGLE_EXPLODE" });
    expect(ghostVisible(s)).toBe(true);
  });

  it("stale animation events are ignored after a step change", () => {
    let s = initGuided(5);
    const old = s.animToken;
    s = guidedReducer(s, { type: "NEXT" });
    s = guidedReducer(s, { type: "ANIM_DONE", token: old });
    expect(s.animating).toBe(true);
  });

  it("rewinding restores exactly the previous assembly", () => {
    let s = initGuided(COTTAGE.steps.length);
    s = guidedReducer(s, { type: "NEXT" });
    s = guidedReducer(s, { type: "NEXT" });
    s = guidedReducer(s, { type: "PREV" });
    expect(s.animating).toBe(false);
    expect(assemblyAt(COTTAGE, s.step).map((b) => b.uid)).toEqual([...COTTAGE.steps[0].bricks, ...COTTAGE.steps[1].bricks].map((b) => b.uid));
  });

  it("changing steps exits exploded view", () => {
    let s = initGuided(5);
    s = guidedReducer(s, { type: "TOGGLE_EXPLODE" });
    s = guidedReducer(s, { type: "NEXT" });
    expect(s.exploded).toBe(false);
  });
});

describe("exploded view", () => {
  it("bricks of a step never overlap each other when fully exploded", () => {
    for (const instr of Object.values(MODELS)) {
      instr.steps.forEach((step, i) => {
        const vec = explodeVectors(assemblyAt(instr, i - 1), step.bricks);
        const boxes = step.bricks.map((b) => {
          const bb = sceneBounds([b]);
          const v = vec.get(b.uid)!;
          return { min: bb.min.map((m, k) => m + v[k] + 0.01), max: bb.max.map((m, k) => m + v[k] - 0.01) };
        });
        for (let a = 0; a < boxes.length; a++)
          for (let c = a + 1; c < boxes.length; c++) {
            const A = boxes[a], C = boxes[c];
            const overlap = [0, 1, 2].every((k) => A.min[k] < C.max[k] && C.min[k] < A.max[k]);
            expect(overlap, `${instr.id} step ${i + 1}`).toBe(false);
          }
      });
    }
  });
  it("lifts bricks above the existing assembly", () => {
    const vec = explodeVectors(assemblyAt(COTTAGE, 3), COTTAGE.steps[4].bricks);
    for (const v of vec.values()) expect(v[1]).toBeGreaterThan(3 * PLATE);
  });
});

describe("LDraw", () => {
  it("round-trips a model exactly", () => {
    const text = exportLDraw(COTTAGE.title, COTTAGE.steps.map((s) => s.bricks));
    const res = importLDraw(text, "rt");
    expect(res.issues).toEqual([]);
    expect(res.instruction!.steps).toHaveLength(COTTAGE.steps.length);
    const strip = (b: BrickInstance) => `${b.partId}:${b.colorId}:${b.x}:${b.y}:${b.z}:${b.rot}`;
    expect(allBricks(res.instruction!).map(strip)).toEqual(allBricks(COTTAGE).map(strip));
  });
  it("flags unknown parts instead of guessing", () => {
    const res = importLDraw("0 Test\n1 4 0 -24 0 1 0 0 0 1 0 0 0 1 99999.dat\n1 4 0 -24 0 1 0 0 0 1 0 0 0 1 3001.dat\n", "x");
    expect(res.pieces).toBe(1);
    expect(res.issues[0].message).toMatch(/not in the validated part library/);
  });
});

describe("estimates", () => {
  it("are ranges that shrink as you progress", () => {
    const all = remainingEstimate(COTTAGE, -1, "standard");
    const later = remainingEstimate(COTTAGE, 8, "standard");
    expect(all.kind).toBe("predicted");
    expect(all.highSec).toBeGreaterThan(all.lowSec);
    expect(later.highSec).toBeLessThan(all.highSec);
    expect(instructionInventory(COTTAGE).length).toBeGreaterThan(5);
  });
});
