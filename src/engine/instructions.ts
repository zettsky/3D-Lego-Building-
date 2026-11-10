/**
 * Structured, machine-readable building instructions — the format the processing pipeline
 * emits and the Guided Build engine plays. Each step lists the bricks it introduces.
 */
import { validateAssembly, type AssemblyIssue, type Box3, type BrickInstance } from "./assembly";
import { inventoryFromBricks, type InventoryLine } from "./inventory";
import { frameMap, frameOrder, worldBounds, type FrameDef } from "./frames";
import type { Join } from "./connect";

export interface InstructionStep {
  bricks: BrickInstance[];
  note?: string;
  /** The step number printed in the source manual, when transcribed from one. */
  manualStep?: number;
  /** The manual page this step appears on. */
  page?: number;
  /** Shown instead of the step number when the manual numbers a sub-build separately (e.g. "Woodstock 3"). */
  label?: string;
}

export interface Instruction {
  id: string;
  title: string;
  steps: InstructionStep[];
  /** How the data was produced — shown to users so nothing looks more verified than it is. */
  provenance: "hand-authored" | "ldraw-import" | "manual-transcription";
  /** Sub-assemblies (see frames.ts). */
  frames?: FrameDef[];
  /** Non-stud connections between posed parts (clips, pins, axles…), see connect.ts. */
  joins?: Join[];
}

/** World bounds of the bricks placed up to `stepIndex`, with sub-assemblies where they are at that step. */
export function boundsAt(instr: Instruction, stepIndex: number, bricks = assemblyAt(instr, stepIndex)): Box3 {
  return worldBounds(bricks, frameMap(instr.frames), stepIndex);
}

/** Bounds that contain the whole build at every step (staged sub-assemblies included). */
export function fullBounds(instr: Instruction): Box3 {
  const frames = frameMap(instr.frames);
  const all = allBricks(instr);
  const a = worldBounds(all, frames, Infinity);
  if (!instr.frames?.length) return a;
  const min = [...a.min] as Box3["min"];
  const max = [...a.max] as Box3["max"];
  for (let i = 0; i < instr.steps.length; i++) {
    if (!instr.frames.some((f) => f.attachStep === i + 1 || f.attachStep === i)) continue;
    const b = worldBounds(assemblyAt(instr, i), frames, i);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], b.min[k]);
      max[k] = Math.max(max[k], b.max[k]);
    }
  }
  return { min, max };
}

export function allBricks(instr: Instruction): BrickInstance[] {
  return instr.steps.flatMap((s) => s.bricks);
}

/** Committed assembly after completing `stepIndex` (−1 = nothing placed yet). */
export function assemblyAt(instr: Instruction, stepIndex: number): BrickInstance[] {
  const out: BrickInstance[] = [];
  for (let i = 0; i <= Math.min(stepIndex, instr.steps.length - 1); i++) out.push(...instr.steps[i].bricks);
  return out;
}

export function instructionInventory(instr: Instruction): InventoryLine[] {
  return inventoryFromBricks(allBricks(instr));
}

/** Pieces of one step aggregated by part + colour, for the step call-out box. */
export function stepCallout(step: InstructionStep): InventoryLine[] {
  return inventoryFromBricks(step.bricks).sort((a, b) => b.qty - a.qty);
}

export interface StepIssue extends AssemblyIssue {
  step: number;
}

/**
 * Deterministic validation: after every step the assembly must be collision-free and every
 * brick must be connected (directly or through other bricks) to the build mat.
 */
export function validateInstruction(instr: Instruction): StepIssue[] {
  const issues: StepIssue[] = [];
  const reported = new Set<string>();
  const frames = frameMap(instr.frames);
  if (instr.frames) frameOrder(instr.frames); // throws on unknown parents / cycles
  for (const b of allBricks(instr))
    if (b.frame && !frames.has(b.frame)) issues.push({ kind: "floating", uid: b.uid, step: -1, message: `${b.uid} uses unknown sub-assembly "${b.frame}"` });
  for (let i = 0; i < instr.steps.length; i++) {
    // Each sub-assembly is checked on its own grid.
    const byFrame = new Map<string, BrickInstance[]>();
    for (const b of assemblyAt(instr, i)) {
      const k = b.frame ?? "";
      if (!byFrame.has(k)) byFrame.set(k, []);
      byFrame.get(k)!.push(b);
    }
    for (const group of byFrame.values()) for (const issue of validateAssembly(group)) {
      const k = `${issue.kind}:${issue.uid}`;
      if (reported.has(k)) continue;
      reported.add(k);
      issues.push({ ...issue, step: i });
    }
  }
  return issues;
}
