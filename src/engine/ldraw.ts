/**
 * LDraw import/export — the deterministic "structured model" path of the instruction pipeline.
 *
 * LDraw units: 1 stud = 20 LDU, 1 plate = 8 LDU, −Y is up. A part's origin is the centre of
 * the top of its body (studs excluded). Rotations about the vertical axis are the same matrix
 * in LDraw and Three.js because the Y flip is a reflection that commutes with Y rotation.
 *
 * Supported: type-1 part references to parts in our library, `0 STEP`, quarter-turn Y
 * rotations, grid-aligned positions. Anything else is reported as an issue for review —
 * never silently guessed.
 */
import { footprint, type BrickInstance, type Rot } from "./assembly";
import { findColorByLdraw, getColor } from "./colors";
import type { Instruction } from "./instructions";
import { findPartByLdraw, getPart } from "./parts";

const LDU_STUD = 20;
const LDU_PLATE = 8;
const COS = [1, 0, -1, 0];
const SIN = [0, 1, 0, -1];

export function exportLDraw(title: string, steps: BrickInstance[][]): string {
  const lines = [`0 ${title}`, `0 Name: ${title.replace(/\s+/g, "_").toLowerCase()}.ldr`, "0 Author: Tsumiki export", ""];
  steps.forEach((bricks, i) => {
    for (const b of bricks) {
      const part = getPart(b.partId);
      const { fw, fd } = footprint(part, b.rot);
      const x = (b.x + fw / 2) * LDU_STUD;
      const z = (b.z + fd / 2) * LDU_STUD;
      const y = -(b.y + part.h) * LDU_PLATE;
      const c = COS[b.rot];
      const s = SIN[b.rot];
      const m = [c, 0, s, 0, 1, 0, -s, 0, c].map((v) => (Object.is(v, -0) ? 0 : v));
      lines.push(`1 ${getColor(b.colorId).ldraw} ${x} ${y} ${z} ${m.join(" ")} ${part.ldraw}`);
    }
    if (i < steps.length - 1) lines.push("0 STEP");
  });
  return lines.join("\n") + "\n";
}

export interface ImportIssue {
  line: number;
  message: string;
}

export interface ImportResult {
  instruction: Instruction | null;
  issues: ImportIssue[];
  pieces: number;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;

export function importLDraw(text: string, id: string, fallbackTitle = "Imported model"): ImportResult {
  const issues: ImportIssue[] = [];
  const steps: BrickInstance[][] = [[]];
  let title = fallbackTitle;
  let seenFile = 0;
  let uid = 0;
  const rows = text.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i].trim();
    if (!raw) continue;
    const tok = raw.split(/\s+/);
    if (tok[0] === "0") {
      if (tok[1] === "FILE") {
        seenFile++;
        if (seenFile > 1) {
          issues.push({ line: i + 1, message: "Multi-part (MPD) sub-models are not supported yet — only the main model was read." });
          break;
        }
      } else if (tok[1] === "STEP") {
        if (steps[steps.length - 1].length) steps.push([]);
      } else if (i < 3 && tok.length > 1 && !tok[1].endsWith(":") && !tok[1].startsWith("!") && title === fallbackTitle) {
        title = tok.slice(1).join(" ");
      }
      continue;
    }
    if (tok[0] !== "1") {
      if (["2", "3", "4", "5"].includes(tok[0])) issues.push({ line: i + 1, message: "Raw geometry lines are ignored." });
      continue;
    }
    if (tok.length < 15) {
      issues.push({ line: i + 1, message: "Malformed part line." });
      continue;
    }
    const code = Number(tok[1]);
    const [x, y, z, a, b, c, d, e, f, g, h, k] = tok.slice(2, 14).map(Number);
    const file = tok.slice(14).join(" ");
    const part = findPartByLdraw(file);
    if (!part) {
      issues.push({ line: i + 1, message: `Part "${file}" is not in the validated part library yet.` });
      continue;
    }
    const color = findColorByLdraw(code);
    if (!color) {
      issues.push({ line: i + 1, message: `LDraw colour ${code} is not supported yet.` });
      continue;
    }
    if (!(near(b, 0) && near(d, 0) && near(f, 0) && near(h, 0) && near(e, 1) && near(a, k) && near(c, -g))) {
      issues.push({ line: i + 1, message: `${file}: only upright quarter-turn rotations are supported.` });
      continue;
    }
    const rotIdx = [0, 1, 2, 3].find((r) => near(a, COS[r]) && near(c, SIN[r]));
    if (rotIdx === undefined) {
      issues.push({ line: i + 1, message: `${file}: rotation is not a multiple of 90°.` });
      continue;
    }
    const rot = rotIdx as Rot;
    const { fw, fd } = footprint(part, rot);
    const gx = x / LDU_STUD - fw / 2;
    const gz = z / LDU_STUD - fd / 2;
    const gy = -y / LDU_PLATE - part.h;
    if (![gx, gy, gz].every((v) => near(v, Math.round(v)))) {
      issues.push({ line: i + 1, message: `${file}: position is not aligned to the stud grid.` });
      continue;
    }
    uid++;
    steps[steps.length - 1].push({
      uid: `${id}-${uid}`,
      partId: part.id,
      colorId: color.id,
      x: Math.round(gx),
      y: Math.round(gy),
      z: Math.round(gz),
      rot,
    });
  }
  const nonEmpty = steps.filter((s) => s.length);
  if (!nonEmpty.length) return { instruction: null, issues: [...issues, { line: 0, message: "No usable parts found." }], pieces: 0 };
  // Normalise so the model sits on the mat starting at y = 0 and near the origin.
  const all = nonEmpty.flat();
  const minY = Math.min(...all.map((b) => b.y));
  const minX = Math.min(...all.map((b) => b.x));
  const minZ = Math.min(...all.map((b) => b.z));
  for (const b of all) {
    b.y -= minY;
    b.x -= minX;
    b.z -= minZ;
  }
  return {
    instruction: { id, title, provenance: "ldraw-import", steps: nonEmpty.map((bricks) => ({ bricks })) },
    issues,
    pieces: all.length,
  };
}
