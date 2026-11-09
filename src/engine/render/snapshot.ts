/**
 * Thumbnail renderer: ONE offscreen WebGL renderer shared by the whole app renders real 3D
 * thumbnails of parts and models (same geometry as the workspace) into cached data URLs.
 * Avoids mounting dozens of WebGL canvases for inventory lists and set cards.
 */
import * as THREE from "three";
import { boundsCenter, boundsRadius, brickTransform, sceneBounds, type BrickInstance } from "../assembly";
import { brickMaterial, partGeometry } from "./geometry";

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

export function snapshot(key: string, bricks: BrickInstance[], size = 160): string | null {
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
  const bounds = sceneBounds(bricks);
  const c = boundsCenter(bounds);
  const radius = boundsRadius(bounds);
  for (const b of bricks) {
    const t = brickTransform(b);
    const m = new THREE.Mesh(partGeometry(b.partId), brickMaterial(b.colorId));
    m.position.set(t.position[0] - c[0], t.position[1] - c[1], t.position[2] - c[2]);
    m.rotation.y = t.rotationY;
    scene.add(m);
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
