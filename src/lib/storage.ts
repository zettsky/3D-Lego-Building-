/**
 * Persistence (Phase 1: browser localStorage). Every access is wrapped so private windows
 * or blocked storage degrade gracefully. Phase 8 moves this behind an API with accounts.
 */
import type { BrickInstance } from "@/engine/assembly";
import type { Pace } from "@/engine/estimate";
import type { Instruction } from "@/engine/instructions";

const PREFIX = "tsumiki.v1.";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new Event("tsumiki-storage"));
  } catch {
    /* storage unavailable — progress simply won't persist */
  }
}

export interface GuidedProgress {
  setId: string;
  step: number;
  total: number;
  updatedAt: number;
}

export function getProgress(setId: string): GuidedProgress | null {
  return read<Record<string, GuidedProgress>>("progress", {})[setId] ?? null;
}

export function saveProgress(p: GuidedProgress) {
  const all = read<Record<string, GuidedProgress>>("progress", {});
  all[p.setId] = p;
  write("progress", all);
}

export function clearProgress(setId: string) {
  const all = read<Record<string, GuidedProgress>>("progress", {});
  delete all[setId];
  write("progress", all);
}

export function listProgress(): GuidedProgress[] {
  return Object.values(read<Record<string, GuidedProgress>>("progress", {})).sort((a, b) => b.updatedAt - a.updatedAt);
}

export interface CustomProject {
  id: string;
  name: string;
  setId: string;
  bricks: BrickInstance[];
  createdAt: number;
  updatedAt: number;
}

export function listProjects(): CustomProject[] {
  return read<CustomProject[]>("projects", []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): CustomProject | null {
  return read<CustomProject[]>("projects", []).find((p) => p.id === id) ?? null;
}

export function saveProject(p: CustomProject) {
  const all = read<CustomProject[]>("projects", []).filter((x) => x.id !== p.id);
  write("projects", [...all, p]);
}

export function deleteProject(id: string) {
  write("projects", read<CustomProject[]>("projects", []).filter((x) => x.id !== id));
}

export function getPace(): Pace {
  return read<Pace>("pace", "standard");
}

export function setPace(p: Pace) {
  write("pace", p);
}

/** Instructions imported by the user (LDraw), kept locally. */
export function listImports(): Instruction[] {
  return read<Instruction[]>("imports", []);
}

export function saveImport(i: Instruction) {
  write("imports", [...listImports().filter((x) => x.id !== i.id), i]);
}

export function deleteImport(id: string) {
  write("imports", listImports().filter((x) => x.id !== id));
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
