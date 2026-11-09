/**
 * Structured, machine-readable building instructions — the format the processing pipeline
 * emits and the Guided Build engine plays. Each step lists the bricks it introduces.
 */
import { validateAssembly, type AssemblyIssue, type BrickInstance } from "./assembly";
import { inventoryFromBricks, type InventoryLine } from "./inventory";

export interface InstructionStep {
  bricks: BrickInstance[];
  note?: string;
}

export interface Instruction {
  id: string;
  title: string;
  steps: InstructionStep[];
  /** How the data was produced — shown to users so nothing looks more verified than it is. */
  provenance: "hand-authored" | "ldraw-import";
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
  for (let i = 0; i < instr.steps.length; i++) {
    for (const issue of validateAssembly(assemblyAt(instr, i))) {
      const k = `${issue.kind}:${issue.uid}`;
      if (reported.has(k)) continue;
      reported.add(k);
      issues.push({ ...issue, step: i });
    }
  }
  return issues;
}
