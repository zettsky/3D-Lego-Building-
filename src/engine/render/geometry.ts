/**
 * Geometry system: one cached BufferGeometry per part, built from real dimensions,
 * plus shared materials per colour. Geometry is centred in x/z with its bottom at y = 0,
 * matching `brickTransform` in assembly.ts.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getPart, hasStudAt, type PartDef } from "../parts";
import { getColor } from "../colors";
import { CLEARANCE, PLATE, STUD_HEIGHT, STUD_RADIUS } from "../units";

const geoCache = new Map<string, THREE.BufferGeometry>();

function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(n.attributes)) if (name !== "position" && name !== "normal") n.deleteAttribute(name);
  return n;
}

function studs(part: PartDef, topY: number, studY?: (lz: number) => number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let lx = 0; lx < part.w; lx++)
    for (let lz = 0; lz < part.d; lz++) {
      if (!hasStudAt(part, lx, lz)) continue;
      const s = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20, 1, false);
      s.translate(lx + 0.5 - part.w / 2, (studY ? studY(lz) : topY) + STUD_HEIGHT / 2, lz + 0.5 - part.d / 2);
      out.push(clean(s));
    }
  return out;
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
  const pieces: THREE.BufferGeometry[] = [];

  if (part.category === "slope") {
    // 45° slope: 1.6 mm front lip, rising one stud pitch over the front row, flat back row.
    const z0 = -part.d / 2 + CLEARANCE;
    const z1 = part.d / 2 - CLEARANCE;
    const lip = 1.6 / 8;
    const flatStart = part.d / 2 - 1;
    const profile: [number, number][] = [
      [z0, 0],
      [z1, 0],
      [z1, H],
      [flatStart, H],
      [z0, lip],
    ];
    pieces.push(prism(profile, -W / 2, W / 2));
    pieces.push(...studs(part, H));
  } else {
    const radius = Math.min(0.04, H / 4);
    const body = new RoundedBoxGeometry(W, H, D, 2, radius);
    body.translate(0, H / 2, 0);
    pieces.push(clean(body));
    if (part.category !== "tile") pieces.push(...studs(part, H));
  }
  const merged = mergeGeometries(pieces.map(clean), false)!;
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  geoCache.set(partId, merged);
  return merged;
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
