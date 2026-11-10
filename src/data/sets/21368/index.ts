/**
 * LEGO® Ideas 21368 Peanuts: Snoopy's Doghouse, transcribed step by step from the official
 * building instructions. Every part comes from the manual's parts list (bom.ts); each step
 * carries its manual step number and page. Sections live in their own files.
 */
import type { Instruction } from "@/engine/instructions";
import type { Kit } from "../dsl";
import { sn } from "./snoopy";
import { sh } from "./snoopyHead";
import { wd } from "./woodstock";
import { lw } from "./lawn";
import { sk } from "./sky";
import { dh } from "./doghouse";
import { cf, tw } from "./displays";

function combine(id: string, title: string, kits: Kit[]): Instruction {
  return {
    id,
    title,
    provenance: "manual-transcription",
    // stable sort by manual step (Woodstock is stored as 78.01–78.11)
    steps: kits.flatMap((k) => k.steps).map((s, i) => [s, i] as const).sort((a, b) => (a[0].manualStep ?? 0) - (b[0].manualStep ?? 0) || a[1] - b[1]).map(([s]) => s),
    frames: kits.flatMap((k) => k.frames),
    joins: kits.flatMap((k) => k.joins),
  };
}

const BASE = [sn, sh, wd, lw, sk, dh];

/** Steps 1–225, then the typewriter display (226–254). */
export const LEGO_21368 = combine("lego-21368", "Peanuts: Snoopy's Doghouse", [...BASE, tw]);

/** Steps 1–225, then the campfire display (226–244). */
export const LEGO_21368_CAMPFIRE = combine("lego-21368-campfire", "Peanuts: Snoopy's Doghouse — campfire display", [...BASE, cf]);
