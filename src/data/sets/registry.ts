import type { Instruction } from "@/engine/instructions";
import { LEGO_21368 } from "./21368";

/** Instructions in progress, reachable from the development step viewer. */
export const DEV_MODELS: Record<string, Instruction> = { "21368": LEGO_21368 };
