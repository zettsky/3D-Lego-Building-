/**
 * Browser-side loader for the packed LDraw meshes (public/ldraw/meshes.json, produced by
 * tools/pack-ldraw.mjs). Geometry is decoded lazily per part and returned in the engine's
 * grid convention (footprint centred in x/z, bottom at y = 0), so the same geometry serves
 * grid-placed bricks and LDraw-posed parts (see poseTransform).
 *
 * Triangle groups: group 0 uses the part's own colour (LDraw colour 16); further groups are
 * fixed colours (prints), listed in geometry.userData.groupColours as LDraw codes.
 */
import * as THREE from "three";
import { gridOriginOffset, hasLdraw } from "./library";

interface PackedGroup {
  v: string;
  i: string;
  big: boolean;
}
interface PackedPart {
  t: Record<string, PackedGroup>;
  e: string;
}

let packed: Record<string, PackedPart> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function ldrawMeshesReady(): boolean {
  return packed !== null;
}

export function loadLdrawMeshes(): Promise<void> {
  if (packed) return Promise.resolve();
  if (!loading)
    loading = fetch("/ldraw/meshes.json")
      .then((r) => {
        if (!r.ok) throw new Error(`meshes.json ${r.status}`);
        return r.json();
      })
      .then((j) => {
        packed = j;
        listeners.forEach((fn) => fn());
      })
      .catch((err) => {
        // Rendering falls back to the procedural shapes.
        console.warn("LDraw meshes unavailable:", err);
        packed = {};
        listeners.forEach((fn) => fn());
      });
  return loading;
}

export function onLdrawMeshes(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function b64(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out.buffer;
}

const geoCache = new Map<string, THREE.BufferGeometry | null>();
const edgeCache = new Map<string, THREE.BufferGeometry | null>();

/** Packed integers are LDU × 20; scene = (x, −y, z) / 20, then shifted into grid convention. */
function toScene(src: Int16Array, o: [number, number, number]): Float32Array {
  const out = new Float32Array(src.length);
  for (let k = 0; k < src.length; k += 3) {
    out[k] = src[k] / 400 + o[0];
    out[k + 1] = -src[k + 1] / 400 + o[1];
    out[k + 2] = src[k + 2] / 400 + o[2];
  }
  return out;
}

export function ldrawGeometry(id: string): THREE.BufferGeometry | null {
  if (geoCache.has(id)) return geoCache.get(id)!;
  if (!packed || !hasLdraw(id) || !packed[id]) return null;
  const o = gridOriginOffset(id);
  const groups = Object.entries(packed[id].t).sort(([a], [b]) => (a === "16" ? -1 : b === "16" ? 1 : +a - +b));
  const pos: number[] = [];
  const geo = new THREE.BufferGeometry();
  const groupColours: (number | null)[] = [];
  let start = 0;
  for (const [code, g] of groups) {
    const verts = toScene(new Int16Array(b64(g.v)), o);
    const idx = g.big ? new Uint32Array(b64(g.i)) : new Uint16Array(b64(g.i));
    for (let k = 0; k < idx.length; k++) {
      const n = idx[k] * 3;
      pos.push(verts[n], verts[n + 1], verts[n + 2]);
    }
    geo.addGroup(start, idx.length, groupColours.length);
    groupColours.push(code === "16" ? null : +code);
    start += idx.length;
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  geo.userData.groupColours = groupColours;
  geoCache.set(id, geo);
  return geo;
}

/** The part's LDraw edge lines (the outline look of printed instructions). */
export function ldrawEdges(id: string): THREE.BufferGeometry | null {
  if (edgeCache.has(id)) return edgeCache.get(id)!;
  if (!packed || !packed[id] || !packed[id].e) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(toScene(new Int16Array(b64(packed[id].e)), gridOriginOffset(id)), 3));
  edgeCache.set(id, g);
  return g;
}
