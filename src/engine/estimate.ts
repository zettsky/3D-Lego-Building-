/**
 * Build-time estimation.
 *
 * Phase 1 has NO measured builder data, so every number here is a *prediction* and is
 * labelled as such in the UI. Predictions are ranges, never single precise values.
 * Phase 7 replaces the per-piece constants with consent-based measured sessions.
 */
import { getPart, type PartCategory } from "./parts";
import type { Instruction } from "./instructions";

export type Pace = "relaxed" | "standard" | "experienced";

export const PACE_LABEL: Record<Pace, string> = {
  relaxed: "Relaxed",
  standard: "Standard",
  experienced: "Experienced",
};

const PACE_FACTOR: Record<Pace, number> = { relaxed: 1.4, standard: 1, experienced: 0.7 };

/** Seconds to find + place one piece, by category (heuristic, not measured). */
const SECONDS_PER_PIECE: Record<PartCategory, number> = { plate: 9, brick: 8, tile: 10, slope: 11, panel: 9, arch: 11, round: 10, snot: 13, special: 12 };
const SECONDS_PER_STEP = 10; // reading the step, finding the spot

export interface TimeEstimate {
  lowSec: number;
  highSec: number;
  kind: "predicted" | "measured";
  basis: string;
}

function range(sec: number, basis: string): TimeEstimate {
  return { lowSec: sec * 0.8, highSec: sec * 1.3, kind: "predicted", basis };
}

export function stepSeconds(instr: Instruction, stepIndex: number, pace: Pace): number {
  const step = instr.steps[stepIndex];
  if (!step) return 0;
  const pieces = step.bricks.reduce((s, b) => s + SECONDS_PER_PIECE[getPart(b.partId).category], 0);
  return (pieces + SECONDS_PER_STEP) * PACE_FACTOR[pace];
}

/** Remaining time *after* completing `stepIndex` (pass −1 for the whole build). */
export function remainingEstimate(instr: Instruction, stepIndex: number, pace: Pace): TimeEstimate {
  let sec = 0;
  for (let i = stepIndex + 1; i < instr.steps.length; i++) sec += stepSeconds(instr, i, pace);
  return range(sec, "Predicted from piece types and step count — no measured builder data yet.");
}

/** For catalog sets without processed instructions: piece-count heuristic only. */
export function estimateFromPieceCount(pieces: number, pace: Pace = "standard"): TimeEstimate {
  // Large sets are built in bags; empirical rule of thumb ~8–9 s/piece for adults.
  return range(pieces * 8.5 * PACE_FACTOR[pace], "Predicted from piece count only.");
}

export function formatDuration(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h >= 10) return `${h} hr`;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

export function formatRange(e: TimeEstimate): string {
  if (e.highSec < 30) return "almost done";
  const lo = formatDuration(e.lowSec);
  const hi = formatDuration(e.highSec);
  return lo === hi ? `~${lo}` : `${lo} – ${hi}`;
}
