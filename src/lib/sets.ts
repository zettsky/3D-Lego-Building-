/**
 * Resolves a set id to catalog data — including user-imported LDraw models (client only).
 */
import { CATALOG, getSet, type SetEntry } from "@/data/catalog";
import { instructionInventory, type Instruction } from "@/engine/instructions";
import { totalPieces } from "@/engine/inventory";
import { listImports } from "./storage";

export function importToSet(i: Instruction): SetEntry {
  return {
    id: `import-${i.id}`,
    setNumber: "UPLOAD",
    name: i.title,
    theme: "My Uploads",
    pieces: totalPieces(instructionInventory(i)),
    keywords: ["upload", "ldraw"],
    description: "Imported from an LDraw file and validated against the part library. Stored only in this browser.",
    status: "interactive",
    instruction: i,
    official: false,
  };
}

export function resolveSet(id: string): SetEntry | undefined {
  const s = getSet(id);
  if (s) return s;
  if (id.startsWith("import-") && typeof window !== "undefined") {
    const imp = listImports().find((i) => `import-${i.id}` === id);
    return imp ? importToSet(imp) : undefined;
  }
  return undefined;
}

export function allSets(): SetEntry[] {
  if (typeof window === "undefined") return CATALOG;
  return [...CATALOG, ...listImports().map(importToSet)];
}
