/**
 * Geometry system: one cached BufferGeometry per part, built from real dimensions,
 * plus shared materials per colour. Geometry is centred in x/z with its bottom at y = 0,
 * matching `brickTransform` in assembly.ts.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getPart, studPoints, type PartDef } from "../parts";
import { getColor } from "../colors";
import { CLEARANCE, PLATE, STUD_HEIGHT, STUD_RADIUS } from "../units";

const geoCache = new Map<string, THREE.BufferGeometry>();

function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(n.attributes)) if (name !== "position" && name !== "normal") n.deleteAttribute(name);
  return n;
}

function studs(part: PartDef, topY: number): THREE.BufferGeometry[] {
  return studPoints(part).map(([px, pz]) => {
    const s = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20, 1, false);
    s.translate(px - part.w / 2, topY + STUD_HEIGHT / 2, pz - part.d / 2);
    return clean(s);
  });
}

/** Studs on vertical faces (sideways building). */
function sideStuds(part: PartDef): THREE.BufferGeometry[] {
  return (part.sideStuds ?? []).map((ss) => {
    const s = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20, 1, false);
    const y = ss.v * PLATE;
    if (ss.face === "-z" || ss.face === "+z") {
      s.rotateX(Math.PI / 2);
      const z = (ss.face === "-z" ? -1 : 1) * (part.d / 2 - CLEARANCE + STUD_HEIGHT / 2);
      s.translate(ss.u - part.w / 2, y, z);
    } else {
      s.rotateZ(Math.PI / 2);
      const x = (ss.face === "-x" ? -1 : 1) * (part.w / 2 - CLEARANCE + STUD_HEIGHT / 2);
      s.translate(x, y, ss.u - part.d / 2);
    }
    return clean(s);
  });
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, radius = 0.03): THREE.BufferGeometry {
  const g = radius > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, h / 4, w / 4, d / 4)) : new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return clean(g);
}

/** Convex prism along X from a (z, y) profile; faces are oriented outward automatically. */
function prism(profile: [number, number][], x0: number, x1: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const cz = profile.reduce((s, p) => s + p[0], 0) / profile.length;
  const cy = profile.reduce((s, p) => s + p[1], 0) / profile.length;
  const center = new THREE.Vector3((x0 + x1) / 2, cy, cz);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    if (n.dot(centroid.sub(center)) < 0) [b, c] = [c, b];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const P = (x: number, i: number) => new THREE.Vector3(x, profile[i][1], profile[i][0]);
  for (let i = 1; i < profile.length - 1; i++) {
    tri(P(x0, 0), P(x0, i), P(x0, i + 1));
    tri(P(x1, 0), P(x1, i), P(x1, i + 1));
  }
  for (let i = 0; i < profile.length; i++) {
    const j = (i + 1) % profile.length;
    tri(P(x0, i), P(x1, i), P(x1, j));
    tri(P(x0, i), P(x1, j), P(x0, j));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function partGeometry(partId: string): THREE.BufferGeometry {
  const hit = geoCache.get(partId);
  if (hit) return hit;
  const part = getPart(partId);
  const H = part.h * PLATE;
  const W = part.w - 2 * CLEARANCE;
  const D = part.d - 2 * CLEARANCE;
  const z0 = -part.d / 2 + CLEARANCE;
  const z1 = part.d / 2 - CLEARANCE;
  const lip = 1.6 / 8;
  const pieces: THREE.BufferGeometry[] = [];

  switch (part.shape) {
    case "slope": {
      // 45° slope: 1.6 mm front lip, rising over the front rows, flat back row with studs.
      const flatStart = part.d / 2 - 1;
      pieces.push(prism([[z0, 0], [z1, 0], [z1, H], [flatStart, H], [z0, lip]], -W / 2, W / 2));
      break;
    }
    case "slope-inv": {
      // Inverted: flat studded top, the underside slopes up toward the front.
      const backStart = part.d / 2 - 1;
      pieces.push(prism([[backStart, 0], [z1, 0], [z1, H], [z0, H], [z0, H - lip]], -W / 2, W / 2));
      break;
    }
    case "cheese": {
      pieces.push(prism([[z0, 0], [z1, 0], [z1, H], [z0, Math.min(lip, H / 3)]], -W / 2, W / 2));
      break;
    }
    case "curve": {
      const prof: [number, number][] = [[z1, 0], [z1, H]];
      const n = 10;
      for (let i = 1; i <= n; i++) {
        const t = (i / n) * (Math.PI / 2);
        prof.push([z1 - (z1 - z0) * Math.sin(t), lip + (H - lip) * Math.cos(t)]);
      }
      prof.push([z0, 0]);
      pieces.push(prism(prof, -W / 2, W / 2));
      break;
    }
    case "panel": {
      const t = 0.15;
      pieces.push(box(W, PLATE, D, 0, 0, 0));
      pieces.push(box(W, H - PLATE, t, 0, PLATE * 0.5, z1 - t / 2, 0.01));
      pieces.push(box(W, PLATE, D, 0, H - PLATE, 0));
      pieces.push(box(t, H - PLATE, D, -W / 2 + t / 2, PLATE * 0.5, 0, 0.01));
      pieces.push(box(t, H - PLATE, D, W / 2 - t / 2, PLATE * 0.5, 0, 0.01));
      break;
    }
    case "arch": {
      // One leg (local x = 0 column) and a quarter-ellipse underside up to the far end.
      const top = PLATE * 1.25;
      const rx = W - 1;
      const ry = H - top;
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, 0);
      shape.lineTo(-W / 2 + 1 - CLEARANCE, 0);
      for (let i = 1; i <= 16; i++) {
        const t = (i / 16) * (Math.PI / 2);
        shape.lineTo(W / 2 - rx * Math.cos(t) - CLEARANCE * (1 - i / 16), ry * Math.sin(t));
      }
      shape.lineTo(W / 2, H);
      shape.lineTo(-W / 2, H);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
      g.translate(0, 0, -D / 2);
      pieces.push(clean(g));
      break;
    }
    case "round": {
      const r = Math.min(W, D) / 2;
      const c = new THREE.CylinderGeometry(r, r, H, 28);
      c.translate(0, H / 2, 0);
      pieces.push(clean(c));
      break;
    }
    case "bracket": {
      pieces.push(box(W, PLATE, D, 0, 0, 0));
      const flangeH = 0.75;
      pieces.push(box(W, flangeH, PLATE * 0.75, 0, PLATE, z0 + PLATE * 0.375, 0.02));
      break;
    }
    case "grass": {
      const blades = 7;
      for (let i = 0; i < blades; i++) {
        const a = (i / blades) * Math.PI * 2;
        const hgt = H * (0.65 + 0.35 * ((i * 37) % 5) / 4);
        const c = new THREE.ConeGeometry(0.11, hgt, 5);
        c.translate(0, hgt / 2, 0);
        c.rotateZ(0.32 * Math.cos(a));
        c.rotateX(0.32 * Math.sin(a));
        c.translate(0.14 * Math.cos(a), 0.05, 0.14 * Math.sin(a));
        pieces.push(clean(c));
      }
      const base = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12);
      base.translate(0, 0.06, 0);
      pieces.push(clean(base));
      break;
    }
    default: {
      const radius = Math.min(0.04, H / 4);
      const body = new RoundedBoxGeometry(W, H, D, 2, radius);
      body.translate(0, H / 2, 0);
      pieces.push(clean(body));
    }
  }
  if (part.shape !== "grass") pieces.push(...studs(part, H));
  pieces.push(...sideStuds(part));
  const merged = mergeGeometries(pieces.map(clean), false)!;
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  geoCache.set(partId, merged);
  return merged;
}

/** A transparent overlay carrying a part's printed decoration (e.g. the SNOOPY sign tile). */
const printCache = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } | null>();
export function printOverlay(partId: string): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } | null {
  if (printCache.has(partId)) return printCache.get(partId)!;
  const part = getPart(partId);
  if (!part.print || typeof document === "undefined") {
    printCache.set(partId, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round((512 * part.d) / part.w);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4A0F0A";
  ctx.font = `bold ${Math.round(canvas.height * 0.62)}px "Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-0.06);
  ctx.fillText(part.print, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geometry = new THREE.PlaneGeometry(part.w * 0.94, part.d * 0.9);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, part.h * PLATE + 0.004, 0);
  const material = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false });
  const out = { geometry, material };
  printCache.set(partId, out);
  return out;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();

export function brickMaterial(colorId: string): THREE.MeshStandardMaterial {
  const hit = matCache.get(colorId);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(getColor(colorId).hex), roughness: 0.38, metalness: 0 });
  matCache.set(colorId, m);
  return m;
}

/** Translucent preview material — sage when valid, terracotta when invalid or highlighted. */
export function makeGhostMaterial(hex: string, opacity = 0.42): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    transparent: true,
    opacity,
    roughness: 0.6,
    depthWrite: false,
  });
}

export const GHOST_SAGE = "#8FA474";
export const GHOST_TERRACOTTA = "#C96B55";
