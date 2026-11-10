/**
 * LDraw MPD / LDR parser for structured set models (e.g. the LDraw Official Model Repository).
 *
 * Reads `0 FILE` sections, header meta (title, Name, Author, !LICENSE, !LDRAW_ORG), type-1 references,
 * `0 STEP` / `0 ROTSTEP`, and expands sub-models into a flat, ordered list of building steps with each part's
 * world pose (LDraw units and axes, exactly the engine's `LdPose`).
 *
 * Step order: the order written in the file (`stepOrder: "source"`) when the file has STEP lines; otherwise
 * "unknown" and the whole model is one step. A sub-model is built (its own steps, in order) right before the
 * parent step that places it, the way printed manuals show sub-builds. Several copies of one sub-model placed
 * in the same parent step are built together: each sub-model step adds the parts of every copy.
 *
 * Nothing is guessed: unknown meta is ignored, colour 16 inherits the parent colour, raw geometry lines
 * (types 2–5) in a model file are reported, and recursion is bounded.
 */
export type Mat = [number, number, number, number, number, number, number, number, number, number, number, number]; // x y z a b c d e f g h i

export const IDENTITY: Mat = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];

export interface MpdFile {
  name: string; // as written in 0 FILE (or "main" for a plain LDR)
  key: string; // normalised lookup key
  title: string | null;
  author: string | null;
  licence: string | null;
  ldrawOrg: string | null;
  isPart: boolean; // embedded part (e.g. unofficial part inside an OMR MPD)
  lines: Line[];
  hasSteps: boolean;
}

type Line = { kind: "ref"; color: number; mat: Mat; target: string; lineNo: number } | { kind: "step"; lineNo: number } | { kind: "geom"; lineNo: number };

export interface ParsedPart {
  part: string; // LDraw part id: lower-case file name without .dat, backslashes → '/'
  color: number;
  pose: Mat;
  lineNo: number;
  file: string;
  path: string; // sub-model path, e.g. "main > Wheel"
}

export interface ParsedStep {
  submodel: string; // file the step belongs to
  path: string;
  parts: ParsedPart[];
}

export interface ParseIssue {
  severity: "error" | "warning";
  lineNo?: number;
  file?: string;
  message: string;
}

export interface ParsedModel {
  main: MpdFile;
  files: MpdFile[];
  steps: ParsedStep[];
  pieceCount: number;
  stepOrder: "source" | "unknown";
  issues: ParseIssue[];
  stats: { emptyStepsDropped: number; submodelInstances: number; embeddedParts: string[] };
}

export const normKey = (name: string) => name.trim().replace(/\\/g, "/").toLowerCase();
export const partId = (name: string) => normKey(name).replace(/\.dat$/, "");

const MAX_DEPTH = 32;

export function splitMpd(text: string): { files: MpdFile[]; issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  const files: MpdFile[] = [];
  const rows = text.replace(/^﻿/, "").split(/\r?\n/);
  let cur: MpdFile | null = null;
  const start = (name: string): MpdFile => {
    const f: MpdFile = { name, key: normKey(name), title: null, author: null, licence: null, ldrawOrg: null, isPart: false, lines: [], hasSteps: false };
    files.push(f);
    return f;
  };
  let headerOpen = true;
  for (let i = 0; i < rows.length; i++) {
    const lineNo = i + 1;
    const raw = rows[i].trim();
    if (!raw) continue;
    const tok = raw.split(/\s+/);
    if (tok[0] === "0" && tok[1] === "FILE") {
      cur = start(raw.replace(/^0\s+FILE\s+/, ""));
      headerOpen = true;
      continue;
    }
    if (tok[0] === "0" && tok[1] === "NOFILE") {
      cur = null;
      continue;
    }
    if (!cur) {
      if (files.length) continue; // text between NOFILE and the next FILE
      cur = start("main");
    }
    if (tok[0] === "0") {
      const rest = raw.replace(/^0\s*/, "");
      if (tok[1] === "STEP" || tok[1] === "ROTSTEP") {
        cur.lines.push({ kind: "step", lineNo });
        cur.hasSteps = true;
        headerOpen = false;
      } else if (/^Name:/i.test(rest)) cur.title ??= null;
      else if (/^Author:/i.test(rest)) cur.author = rest.replace(/^Author:\s*/i, "");
      else if (/^!LICENSE/i.test(rest)) cur.licence = rest.replace(/^!LICENSE\s*/i, "");
      else if (/^!LDRAW_ORG/i.test(rest)) {
        cur.ldrawOrg = rest.replace(/^!LDRAW_ORG\s*/i, "");
        if (/(^|_)(Part|Subpart|Primitive|Shortcut|8_Primitive|48_Primitive)\b/i.test(cur.ldrawOrg) && !/Model/i.test(cur.ldrawOrg)) cur.isPart = true;
      } else if (headerOpen && cur.title === null && cur.lines.length === 0 && !rest.startsWith("!") && !/^[A-Z_]+:/.test(rest) && !/^(BFC|\/\/|GHOST|BUFEXCHG|PE_)/.test(rest)) {
        cur.title = rest;
      }
      continue;
    }
    if (tok[0] === "1") {
      headerOpen = false;
      if (tok.length < 15) {
        issues.push({ severity: "error", lineNo, file: cur.name, message: "Malformed type-1 line (fewer than 15 fields)." });
        continue;
      }
      const nums = tok.slice(1, 14).map((t) => (/^0x/i.test(t) ? parseInt(t, 16) : Number(t)));
      if (nums.some((n) => !Number.isFinite(n))) {
        issues.push({ severity: "error", lineNo, file: cur.name, message: "Non-numeric value in type-1 line." });
        continue;
      }
      const target = raw.split(/\s+/).slice(14).join(" ");
      cur.lines.push({ kind: "ref", color: nums[0], mat: nums.slice(1, 13) as Mat, target, lineNo });
      continue;
    }
    if (["2", "3", "4", "5"].includes(tok[0])) {
      cur.lines.push({ kind: "geom", lineNo });
      continue;
    }
    issues.push({ severity: "warning", lineNo, file: cur.name, message: `Unknown line type "${tok[0]}".` });
  }
  return { files, issues };
}

/** parent ∘ child (both LDraw placements). */
export function compose(p: Mat, c: Mat): Mat {
  const [px, py, pz, a, b, cc, d, e, f, g, h, i] = p;
  const [x, y, z, A, B, C, D, E, F, G, H, I] = c;
  return [
    px + a * x + b * y + cc * z,
    py + d * x + e * y + f * z,
    pz + g * x + h * y + i * z,
    a * A + b * D + cc * G,
    a * B + b * E + cc * H,
    a * C + b * F + cc * I,
    d * A + e * D + f * G,
    d * B + e * E + f * H,
    d * C + e * F + f * I,
    g * A + h * D + i * G,
    g * B + h * E + i * H,
    g * C + h * F + i * I,
  ].map((v) => Math.round(v * 1e6) / 1e6) as Mat;
}

export function parseMpd(text: string): ParsedModel {
  const { files, issues } = splitMpd(text);
  if (!files.length) throw new Error("Empty LDraw file");
  const byKey = new Map<string, MpdFile>();
  for (const f of files) {
    if (byKey.has(f.key)) issues.push({ severity: "warning", file: f.name, message: `Duplicate 0 FILE "${f.name}"; the first one is used.` });
    else byKey.set(f.key, f);
  }
  const main = files.find((f) => !f.isPart) ?? files[0];
  const steps: ParsedStep[] = [];
  const stats = { emptyStepsDropped: 0, submodelInstances: 0, embeddedParts: files.filter((f) => f.isPart).map((f) => partId(f.name)) };
  const isSub = (target: string) => {
    const f = byKey.get(normKey(target));
    return f && !f.isPart ? f : null;
  };

  /** Build `file` placed at each of `placements` (several copies built together). */
  const build = (file: MpdFile, placements: { mat: Mat; color: number }[], path: string, stack: string[]) => {
    if (stack.length > MAX_DEPTH || stack.includes(file.key)) {
      issues.push({ severity: "error", file: file.name, message: `Sub-model recursion through "${file.name}" (${[...stack, file.key].join(" > ")}).` });
      return;
    }
    if (file.lines.some((l) => l.kind === "geom")) issues.push({ severity: "warning", file: file.name, message: "Raw geometry lines (types 2–5) in a model file are ignored." });
    // group lines into this file's own steps
    const own: Line[][] = [[]];
    for (const l of file.lines) {
      if (l.kind === "step") own.push([]);
      else if (l.kind === "ref") own[own.length - 1].push(l);
    }
    for (const group of own) {
      // 1) sub-builds referenced in this step, grouped by sub-model, in first-appearance order
      const subs = new Map<string, { file: MpdFile; placements: { mat: Mat; color: number }[] }>();
      const parts: ParsedPart[] = [];
      for (const l of group) {
        if (l.kind !== "ref") continue;
        const sub = isSub(l.target);
        for (const pl of placements) {
          const color = l.color === 16 ? pl.color : l.color;
          const mat = compose(pl.mat, l.mat);
          if (sub) {
            const g = subs.get(sub.key) ?? { file: sub, placements: [] };
            g.placements.push({ mat, color });
            subs.set(sub.key, g);
          } else {
            if (color === 16 || color === 24) issues.push({ severity: "warning", lineNo: l.lineNo, file: file.name, message: `Part ${l.target} has unresolved colour ${color} at the top level.` });
            parts.push({ part: partId(l.target), color, pose: mat, lineNo: l.lineNo, file: file.name, path });
          }
        }
      }
      for (const g of subs.values()) {
        stats.submodelInstances += g.placements.length;
        build(g.file, g.placements, `${path} > ${g.file.name}`, [...stack, file.key]);
      }
      // 2) the parent step itself
      if (parts.length) steps.push({ submodel: file.name, path, parts });
      else if (group.length) stats.emptyStepsDropped++; // a step that only attaches sub-builds
    }
  };
  build(main, [{ mat: IDENTITY, color: 16 }], main.name, []);

  const anySteps = files.some((f) => !f.isPart && f.hasSteps);
  const pieceCount = steps.reduce((n, s) => n + s.parts.length, 0);
  if (!pieceCount) issues.push({ severity: "error", message: "No parts found." });
  return { main, files, steps, pieceCount, stepOrder: anySteps ? "source" : "unknown", issues, stats };
}

/** Licence lines we accept for storing and serving a model (see docs/data/SOURCES.md §5). */
export function classifyLicence(line: string | null): { ok: boolean; licence: string | null; reason?: string } {
  if (!line) return { ok: false, licence: null, reason: "no 0 !LICENSE line" };
  if (/CC\s*BY\s*4\.0/i.test(line) && /CC\s*BY\s*2\.0/i.test(line)) return { ok: true, licence: "CC BY 2.0 and CC BY 4.0" };
  if (/CC\s*BY\s*4\.0/i.test(line)) return { ok: true, licence: "CC BY 4.0" };
  if (/CC\s*BY\s*2\.0|CCAL\s*version\s*2\.0/i.test(line)) return { ok: true, licence: "CC BY 2.0" };
  if (/CC0/i.test(line)) return { ok: true, licence: "CC0" };
  return { ok: false, licence: line, reason: `unrecognised licence "${line}"` };
}
