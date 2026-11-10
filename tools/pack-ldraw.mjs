#!/usr/bin/env node
/**
 * Packs the LDraw parts a model uses into two files the site can load:
 *
 *   src/engine/ldraw/parts-meta.json   bounding boxes, stud and socket points, names
 *                                      (small; imported by the engine and by tests)
 *   public/ldraw/meshes.json           compact triangle + edge meshes for rendering
 *                                      (fetched by the browser)
 *
 * Geometry comes from the official LDraw parts library (CC BY 2.0, www.ldraw.org), which
 * `npm run ldraw:fetch` downloads to .ldraw/ (git-ignored). Only the packed subset is committed.
 *
 * Usage: node tools/pack-ldraw.mjs [extra part ids...]
 * Part ids are read from src/data/sets/** /bom.ts and src/engine/parts.ts plus the arguments.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const LIB = path.join(ROOT, ".ldraw", "ldraw");
const SEARCH = ["parts", "parts/s", "p"].map((d) => path.join(LIB, d));
const UNOFFICIAL = path.join(ROOT, ".ldraw", "unofficial");
if (fs.existsSync(UNOFFICIAL)) SEARCH.push(path.join(UNOFFICIAL, "parts"), path.join(UNOFFICIAL, "parts", "s"), path.join(UNOFFICIAL, "p"));

if (!fs.existsSync(LIB)) {
  console.error("LDraw library not found in .ldraw/ldraw — run `npm run ldraw:fetch` first.");
  process.exit(1);
}

// ── collect part ids ───────────────────────────────────────────────────────
const ids = new Set(process.argv.slice(2));
function walk(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
walk(path.join(ROOT, "src", "data"), (p) => {
  if (!/bom\.ts$/.test(p)) return;
  for (const m of fs.readFileSync(p, "utf8").matchAll(/part: "([^"]+)"/g)) ids.add(m[1]);
});
for (const m of fs.readFileSync(path.join(ROOT, "src", "engine", "parts.ts"), "utf8").matchAll(/(?:brick|plate|tile|def)\("([0-9][^"]*)"/g)) ids.add(m[1]);

// ── file cache / parser ────────────────────────────────────────────────────
const fileCache = new Map();
function findFile(name) {
  const n = name.toLowerCase().replace(/\\/g, "/");
  for (const d of SEARCH) {
    const p = path.join(d, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
function load(name) {
  const key = name.toLowerCase().replace(/\\/g, "/");
  if (fileCache.has(key)) return fileCache.get(key);
  const p = findFile(key);
  if (!p) {
    fileCache.set(key, null);
    return null;
  }
  const text = fs.readFileSync(p, "utf8");
  const lines = text.split(/\r?\n/);
  const out = { title: lines[0].replace(/^0\s*/, "").trim(), cmds: [], category: null, invert: false };
  let invertNext = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const t = l.split(/\s+/);
    if (t[0] === "0") {
      if (t[1] === "!CATEGORY") out.category = t.slice(2).join(" ");
      if (t[1] === "BFC" && t.includes("INVERTNEXT")) invertNext = true;
      continue;
    }
    if (t[0] === "1") {
      const c = +t[1];
      const m = t.slice(2, 14).map(Number);
      out.cmds.push({ type: 1, color: c, m, file: t.slice(14).join(" "), invert: invertNext });
      invertNext = false;
    } else if (t[0] === "2") out.cmds.push({ type: 2, color: +t[1], v: t.slice(2, 8).map(Number) });
    else if (t[0] === "3") out.cmds.push({ type: 3, color: +t[1], v: t.slice(2, 11).map(Number) });
    else if (t[0] === "4") out.cmds.push({ type: 4, color: +t[1], v: t.slice(2, 14).map(Number) });
  }
  fileCache.set(key, out);
  return out;
}

// matrices: LDraw "1 c x y z a b c d e f g h i" = position + 3×3 rows
const IDENT = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
function mul(A, B) {
  // returns A∘B (apply B, then A)
  const [ax, ay, az, a, b, c, d, e, f, g, h, i] = A;
  const [bx, by, bz, A2, B2, C2, D2, E2, F2, G2, H2, I2] = B;
  return [
    a * bx + b * by + c * bz + ax,
    d * bx + e * by + f * bz + ay,
    g * bx + h * by + i * bz + az,
    a * A2 + b * D2 + c * G2, a * B2 + b * E2 + c * H2, a * C2 + b * F2 + c * I2,
    d * A2 + e * D2 + f * G2, d * B2 + e * E2 + f * H2, d * C2 + e * F2 + f * I2,
    g * A2 + h * D2 + i * G2, g * B2 + h * E2 + i * H2, g * C2 + h * F2 + i * I2,
  ];
}
const apply = (M, x, y, z) => [M[3] * x + M[4] * y + M[5] * z + M[0], M[6] * x + M[7] * y + M[8] * z + M[1], M[9] * x + M[10] * y + M[11] * z + M[2]];
const applyDir = (M, x, y, z) => [M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z, M[9] * x + M[10] * y + M[11] * z];

const STUD_RE = /^(stud|stud2|stud2a|stud10|stud15|stud17a|studel|studline|studp\d+|stud-logo\d*|stud2-logo\d*|stud10-logo\d*)\.dat$/i;

function flatten(partName) {
  const tris = new Map(); // colour → number[]
  const edges = [];
  const studs = [];
  let missing = [];
  const rec = (name, M, color, depth) => {
    const f = load(name);
    if (!f) {
      missing.push(name);
      return;
    }
    for (const c of f.cmds) {
      const col = c.color === 16 ? color : c.color === 24 ? 24 : c.color;
      if (c.type === 1) {
        const base = c.file.toLowerCase().split(/[\\/]/).pop();
        const child = mul(M, c.m);
        if (STUD_RE.test(base)) {
          const p = apply(child, 0, 0, 0);
          const d = applyDir(child, 0, -1, 0);
          const len = Math.hypot(...d) || 1;
          studs.push([...p, d[0] / len, d[1] / len, d[2] / len].map((v) => Math.round(v * 100) / 100));
        }
        if (depth < 24) rec(c.file, child, col, depth + 1);
      } else if (c.type === 2) {
        const a = apply(M, c.v[0], c.v[1], c.v[2]);
        const b = apply(M, c.v[3], c.v[4], c.v[5]);
        edges.push(...a, ...b);
      } else {
        const v = c.v;
        const P = (k) => apply(M, v[k * 3], v[k * 3 + 1], v[k * 3 + 2]);
        const arr = tris.get(col) ?? [];
        if (c.type === 3) arr.push(...P(0), ...P(1), ...P(2));
        else arr.push(...P(0), ...P(1), ...P(2), ...P(0), ...P(2), ...P(3));
        tris.set(col, arr);
      }
    }
  };
  rec(partName, IDENT, 16, 0);
  return { tris, edges, studs, missing };
}

// ── compact mesh encoding: indexed, int16 at 1/20 LDU, base64 ─────────────────
const Q = 20;
function encodeTris(arr) {
  const map = new Map();
  const verts = [];
  const idx = [];
  for (let i = 0; i < arr.length; i += 3) {
    const k = `${Math.round(arr[i] * Q)},${Math.round(arr[i + 1] * Q)},${Math.round(arr[i + 2] * Q)}`;
    let n = map.get(k);
    if (n === undefined) {
      n = verts.length / 3;
      map.set(k, n);
      verts.push(Math.round(arr[i] * Q), Math.round(arr[i + 1] * Q), Math.round(arr[i + 2] * Q));
    }
    idx.push(n);
  }
  const v = Buffer.from(new Int16Array(verts).buffer).toString("base64");
  const big = verts.length / 3 > 65535;
  const ix = Buffer.from((big ? new Uint32Array(idx) : new Uint16Array(idx)).buffer).toString("base64");
  return { v, i: ix, big };
}
const encodeLines = (arr) => Buffer.from(new Int16Array(arr.map((x) => Math.round(x * Q))).buffer).toString("base64");

// Printed parts: the LDraw file for the same print, or the plain part when the print is not
// in the library yet (the site then draws the print as an overlay).
const ALIAS = {
  "98138pr0107": "98138p0y", // black round tile with white dot
  "98138pr0048": "98138p0n", // round tile with tree-stump print
  "69729pr0080": "69729", // SNOOPY tile: print drawn by the site
  "87079pr0153": "87079", // typewriter paper: print drawn by the site
  "76796pr0003": "76796", // windscreen with black ovals: print drawn by the site
};

// ── run ────────────────────────────────────────────────────────────────────
const meta = {};
const meshes = {};
const report = { packed: [], notInLibrary: [], missingSubfiles: new Set() };
for (const id of [...ids].sort()) {
  const file = `${ALIAS[id] ?? id}.dat`;
  const head = load(file);
  if (!head) {
    report.notInLibrary.push(id);
    continue;
  }
  const { tris, edges, studs, missing } = flatten(file);
  missing.forEach((m) => report.missingSubfiles.add(m));
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const arr of tris.values())
    for (let i = 0; i < arr.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], arr[i + k]);
        max[k] = Math.max(max[k], arr[i + k]);
      }
  meta[id] = {
    file: ALIAS[id] ? `${ALIAS[id]}.dat` : undefined,
    name: head.title,
    category: head.category,
    min: min.map((v) => Math.round(v * 100) / 100),
    max: max.map((v) => Math.round(v * 100) / 100),
    studs,
  };
  const groups = {};
  for (const [col, arr] of tris) groups[col] = encodeTris(arr);
  meshes[id] = { t: groups, e: encodeLines(edges) };
  report.packed.push(id);
}

// LDraw colours used by fixed-colour geometry (prints), from LDConfig.ldr.
const used = new Set();
for (const m of Object.values(meshes)) for (const k of Object.keys(m.t)) used.add(+k);
const colours = {};
for (const line of fs.readFileSync(path.join(LIB, "LDConfig.ldr"), "utf8").split(/\r?\n/)) {
  const m = line.match(/!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})(?:.*ALPHA\s+(\d+))?/);
  if (m && used.has(+m[2])) colours[m[2]] = { name: m[1], hex: m[3], alpha: m[4] ? +m[4] / 255 : 1 };
}
meta.__colours = colours;

const metaPath = path.join(ROOT, "src", "engine", "ldraw", "parts-meta.json");
const meshPath = path.join(ROOT, "public", "ldraw", "meshes.json");
fs.mkdirSync(path.dirname(metaPath), { recursive: true });
fs.mkdirSync(path.dirname(meshPath), { recursive: true });
fs.writeFileSync(metaPath, JSON.stringify(meta));
fs.writeFileSync(meshPath, JSON.stringify(meshes));
console.log(`packed ${report.packed.length} parts`);
console.log(`meta ${(fs.statSync(metaPath).size / 1024).toFixed(0)} KB, meshes ${(fs.statSync(meshPath).size / 1024 / 1024).toFixed(2)} MB`);
if (report.notInLibrary.length) console.log("not in the official library:", report.notInLibrary.join(" "));
if (report.missingSubfiles.size) console.log("missing subfiles:", [...report.missingSubfiles].join(" "));
