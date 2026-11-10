/**
 * Thumbnail renderer: ONE offscreen WebGL renderer shared by the whole app renders real 3D
 * thumbnails of parts and models (same geometry as the workspace) into cached data URLs.
 * Avoids mounting dozens of WebGL canvases for inventory lists and set cards.
 */
import * as THREE from "three";
import { boundsCenter, boundsRadius, type BrickInstance } from "../assembly";
import { placements, worldBounds, type FrameDef } from "../frames";
import { partGeometry, partMaterial, printOverlay } from "./geometry";

let renderer: THREE.WebGLRenderer | null = null;
let failed = false;
const cache = new Map<string, string>();

function getRenderer(): THREE.WebGLRenderer | null {
  if (failed || typeof document === "undefined") return null;
  if (renderer) return renderer;
  try {
    const canvas = document.createElement("canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  } catch {
    failed = true;
    return null;
  }
}

export function snapshot(key: string, bricks: BrickInstance[], size = 160, frames: FrameDef[] = []): string | null {
  const k = `${key}@${size}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const r = getRenderer();
  if (!r || !bricks.length) return null;
  r.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xd8cbb4, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(4, 9, 6);
  scene.add(sun);
  const fm = new Map(frames.map((f) => [f.id, f]));
  const bounds = worldBounds(bricks, fm);
  const c = boundsCenter(bounds);
  const radius = boundsRadius(bounds);
  const shift = new THREE.Matrix4().makeTranslation(-c[0], -c[1], -c[2]);
  for (const { brick, matrix } of placements(bricks, fm)) {
    const world = shift.clone().multiply(matrix);
    const m = new THREE.Mesh(partGeometry(brick.partId), partMaterial(brick.partId, brick.colorId));
    m.matrixAutoUpdate = false;
    m.matrix.copy(world);
    scene.add(m);
    const print = printOverlay(brick.partId);
    if (print) {
      const pm = new THREE.Mesh(print.geometry, print.material);
      pm.matrixAutoUpdate = false;
      pm.matrix.copy(world);
      scene.add(pm);
    }
  }
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 500);
  const dir = new THREE.Vector3(1.15, 0.95, -1.5).normalize();
  const dist = (radius / Math.sin(THREE.MathUtils.degToRad(14))) * 1.02;
  cam.position.copy(dir.multiplyScalar(dist));
  cam.lookAt(0, 0, 0);
  r.setClearColor(0x000000, 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/png");
  cache.set(k, url);
  return url;
}
