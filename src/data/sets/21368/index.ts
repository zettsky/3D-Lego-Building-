/**
 * LEGO® Ideas 21368 Peanuts: Snoopy's Doghouse, transcribed step by step from the official
 * building instructions. Every part comes from the manual's parts list (bom.ts); each step
 * carries its manual step number and page.
 */
import type { Instruction } from "@/engine/instructions";
import { sn } from "./snoopy";

const parts = [sn];

export const LEGO_21368: Instruction = {
  id: "lego-21368",
  title: "Peanuts: Snoopy's Doghouse",
  provenance: "manual-transcription",
  steps: parts.flatMap((k) => k.steps),
  frames: parts.flatMap((k) => k.frames),
  joins: parts.flatMap((k) => k.joins),
};
