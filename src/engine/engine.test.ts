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

// ── Phase 2 ────────────────────────────────────────────────────────────────
import { SNOOPY_DOGHOUSE } from "@/data/sets/snoopyDoghouse";
import { frameMap, frameWorldMatrix, worldBounds, type FrameDef } from "./frames";
import { buildConnectionGraph } from "./assembly";
import { getColor } from "./colors";
import * as THREE from "three";

describe("half-stud grid (jumper plates)", () => {
  it("a brick offset by half a stud clutches a jumper's centre stud", () => {
    const jumper: BrickInstance = { uid: "j", partId: "15573", colorId: "red", x: 0, y: 0, z: 0, rot: 0 };
    const onTop: BrickInstance = { uid: "t", partId: "3005", colorId: "red", x: 0.5, y: 1, z: 0, rot: 0 };
    expect(validateAssembly([jumper, onTop])).toEqual([]);
    const misplaced: BrickInstance = { ...onTop, x: 0 };
    expect(validateAssembly([jumper, misplaced]).map((i) => i.kind)).toContain("floating");
  });
  it("half-offset bricks still collide", () => {
    const a: BrickInstance = { uid: "a", partId: "3004", colorId: "red", x: 0, y: 0, z: 0, rot: 0 };
    const b: BrickInstance = { uid: "b", partId: "3004", colorId: "red", x: 1.5, y: 0, z: 0, rot: 0 };
    expect(validateAssembly([a, b]).map((i) => i.kind)).toContain("collision");
  });
  it("anchored bricks (held sideways) count as supported", () => {
    const a: BrickInstance = { uid: "a", partId: "3004", colorId: "red", x: 0, y: 5, z: 0, rot: 0, anchor: true };
    expect(buildConnectionGraph([a]).grounded.has("a")).toBe(true);
  });
});

describe("sub-assemblies", () => {
  const frames: FrameDef[] = [
    { id: "p", label: "p", position: [10, 0, 0], rotation: [0, 0, 0], staging: { position: [-10, 0, 0], rotation: [0, 0, 0] }, attachStep: 3 },
    { id: "c", label: "c", parent: "p", position: [0, 1, 0], rotation: [Math.PI / 2, 0, 0] },
  ];
  it("nests transforms and switches from staging to final on the attach step", () => {
    const fm = frameMap(frames);
    const at = (step: number) => new THREE.Vector3().setFromMatrixPosition(frameWorldMatrix(fm, "c", step));
    expect(at(0).toArray().map((v) => Math.round(v))).toEqual([-10, 1, 0]);
    expect(at(3).toArray().map((v) => Math.round(v))).toEqual([10, 1, 0]);
  });
  it("rotated frames rotate their bounds", () => {
    const b: BrickInstance = { uid: "x", partId: "3010", colorId: "red", x: 0, y: 0, z: 0, rot: 0, frame: "c" };
    const box = worldBounds([b], frameMap(frames));
    // a 1×4 brick lying on its back: 1 stud deep becomes 1 unit tall
    expect(box.max[1] - box.min[1]).toBeCloseTo(1, 5);
    expect(box.max[0] - box.min[0]).toBeCloseTo(4, 5);
  });
});

describe("Snoopy's Doghouse (21368, steps 79–225)", () => {
  it("is collision-free and fully supported in every sub-assembly at every step", () => {
    expect(validateInstruction(SNOOPY_DOGHOUSE)).toEqual([]);
  });
  it("keeps the manual's step numbers in order", () => {
    const nums = SNOOPY_DOGHOUSE.steps.map((s) => s.manualStep!);
    expect(nums[0]).toBe(79);
    expect(nums[nums.length - 1]).toBe(225);
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
  });
  it("uses only the colours of the set's parts list", () => {
    const used = new Set(allBricks(SNOOPY_DOGHOUSE).map((b) => getColor(b.colorId).name));
    for (const c of used) expect(["Bright Red", "Dark Green", "Black", "White", "Medium Stone Grey", "Dark Stone Grey", "Bright Green"]).toContain(c);
    expect(used.has("Bright Red") && used.has("Dark Green")).toBe(true);
  });
  it("attaches every sub-assembly within the build and stands on the lawn when finished", () => {
    for (const f of SNOOPY_DOGHOUSE.frames!) if (f.attachStep !== undefined) expect(f.attachStep).toBeLessThan(SNOOPY_DOGHOUSE.steps.length);
    const box = worldBounds(allBricks(SNOOPY_DOGHOUSE), frameMap(SNOOPY_DOGHOUSE.frames));
    expect(box.min[1]).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max[0] - box.min[0]).toBeLessThan(25); // nothing left staged off to the side
  });
});

// ── Phase 3: LDraw geometry and the 21368 transcription ─────────────────────
import { LEGO_21368 } from "@/data/sets/21368";
import { BOM_21368, BOM_TOOLS } from "@/data/sets/21368/bom";
import { validatePosed } from "./connect";
import { ldFootprint, ldPartDef } from "./ldraw/library";
import { placements as framePlacements } from "./frames";

describe("LDraw part library", () => {
  it("derives grid footprints and stud points from real geometry", () => {
    expect(ldPartDef("3001")).toMatchObject({ w: 4, d: 2, h: 3 });
    expect(ldPartDef("3001").studPoints).toHaveLength(8);
    expect(ldPartDef("3024")).toMatchObject({ w: 1, d: 1, h: 1 });
    const slope = ldFootprint("54200"); // origin at the bottom of this part
    expect(slope.bottom - slope.top).toBe(16);
  });
});

describe("21368 transcription", () => {
  const bom = new Map<string, number>();
  for (const l of BOM_21368) if (!BOM_TOOLS.has(l.element)) bom.set(`${l.part}|${l.color}`, (bom.get(`${l.part}|${l.color}`) ?? 0) + l.qty);
  const used = new Map<string, number>();
  for (const b of allBricks(LEGO_21368)) used.set(`${b.partId}|${b.colorId}`, (used.get(`${b.partId}|${b.colorId}`) ?? 0) + 1);

  it("the parts list has 963 model pieces", () => {
    expect([...bom.values()].reduce((s, q) => s + q, 0)).toBe(963);
  });
  it("uses only parts from the manual's parts list, never more than it contains", () => {
    for (const [k, q] of used) {
      expect(bom.has(k), `${k} is not in the parts list`).toBe(true);
      expect(q, `${k} used ${q}×, parts list has ${bom.get(k)}`).toBeLessThanOrEqual(bom.get(k)!);
    }
  });
  it("every part sits in an LDraw pose and the model holds together", () => {
    const all = allBricks(LEGO_21368);
    expect(all.every((b) => b.pose)).toBe(true);
    // world space, finished model: each sub-assembly's parts are connected
    const fm = frameMap(LEGO_21368.frames);
    const world = framePlacements(all, fm).map(({ brick, matrix }) => ({ brick, matrix }));
    expect(world.length).toBe(all.length);
    const byFrame = new Map<string, typeof all>();
    for (const b of all) byFrame.set(b.frame ?? "", [...(byFrame.get(b.frame ?? "") ?? []), b]);
    for (const [frame, list] of byFrame) {
      const { issues, components } = validatePosed(list, LEGO_21368.joins ?? []);
      expect(issues.filter((i) => i.kind === "collision" || i.kind === "join-gap"), frame).toEqual([]);
      expect(components.length, `${frame}: ${components.length} separate groups`).toBe(1);
    }
  });
});
