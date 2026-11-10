"use client";
/**
 * The shared 3D workspace: canvas, lighting, build mat, orbit/zoom/pan camera with a smooth
 * rig (reset, fit, gentle per-step focus that never locks the user out).
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { boundsCenter, boundsRadius, type Box3 } from "../assembly";
import { PLATE, STUD_HEIGHT, STUD_RADIUS, type Vec3 } from "../units";
import { useLdrawReady } from "./useLdraw";

export interface WorkspaceHandle {
  reset(): void;
  fit(bounds: Box3): void;
  focus(bounds: Box3): void;
  screenshot(): string | null;
}

interface RigApi {
  goTo(pos: THREE.Vector3, target: THREE.Vector3): void;
  focusTarget(target: THREE.Vector3): void;
}

const DEFAULT_VIEW = new THREE.Vector3(1.1, 0.95, -1.45).normalize();

function distanceFor(radius: number, fov: number, aspect: number) {
  const vfov = THREE.MathUtils.degToRad(fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const f = Math.min(vfov, hfov);
  return (radius / Math.sin(f / 2)) * 1.08;
}

function CameraRig({ apiRef, controlsRef }: { apiRef: React.MutableRefObject<RigApi | null>; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera);
  const goal = useRef<{ pos: THREE.Vector3 | null; target: THREE.Vector3 } | null>(null);
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    apiRef.current = {
      goTo: (pos, target) => (goal.current = { pos: pos.clone(), target: target.clone() }),
      focusTarget: (target) => (goal.current = { pos: null, target: target.clone() }),
    };
    const c = controlsRef.current;
    const cancel = () => (goal.current = null);
    c?.addEventListener("start", cancel);
    return () => c?.removeEventListener("start", cancel);
  }, [apiRef, controlsRef]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controlsRef.current;
    if (!g || !c) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    const before = c.target.clone();
    c.target.lerp(g.target, k);
    if (g.pos) camera.position.lerp(g.pos, k);
    else camera.position.add(c.target.clone().sub(before)); // keep the user's distance/angle
    c.update();
    const done = c.target.distanceTo(g.target) < 0.01 && (!g.pos || camera.position.distanceTo(g.pos) < 0.01);
    if (done) goal.current = null;
  });
  return null;
}

function Baseplate({ size }: { size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16), []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    let i = 0;
    for (let x = 0; x < size; x++)
      for (let z = 0; z < size; z++) {
        m.makeTranslation(x + 0.5, STUD_HEIGHT / 2, z + 0.5);
        ref.current?.setMatrixAt(i++, m);
      }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [size]);
  return (
    <group>
      <mesh position={[size / 2, -PLATE / 4, size / 2]} receiveShadow userData={{ ground: true }}>
        <boxGeometry args={[size, PLATE / 2, size]} />
        <meshStandardMaterial color="#C9CFB4" roughness={0.75} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, undefined, size * size]} receiveShadow castShadow raycast={() => null}>
        <meshStandardMaterial color="#C3CAAD" roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

export interface WorkspaceProps {
  children: ReactNode;
  /** Grid-space point the camera orbits by default. */
  center: Vec3;
  /** Initial framing bounds (grid space, scene units). */
  frame: Box3;
  mat?: "paper" | "baseplate";
  plateSize?: number;
  className?: string;
  onPointerMissed?: () => void;
  autoRotate?: boolean;
  /** Direction from the target to the camera (default: front-right, slightly above). */
  view?: Vec3;
}

export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(
  { children, center, frame, mat = "paper", plateSize = 16, className, onPointerMissed, autoRotate = false, view },
  ref,
) {
  const ready = useLdrawReady();
  const VIEW_DIR = useMemo(() => (view ? new THREE.Vector3(...view).normalize() : DEFAULT_VIEW), [view]);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const apiRef = useRef<RigApi | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const offset = useMemo(() => new THREE.Vector3(-center[0], 0, -center[2]), [center]);

  const viewFor = (b: Box3) => {
    const cam = camRef.current;
    const c = boundsCenter(b);
    const target = new THREE.Vector3(c[0], c[1], c[2]).add(offset);
    const dist = distanceFor(boundsRadius(b), cam?.fov ?? 35, cam?.aspect ?? 1.6);
    return { pos: target.clone().add(VIEW_DIR.clone().multiplyScalar(dist)), target };
  };

  useImperativeHandle(ref, () => ({
    reset() {
      const v = viewFor(frame);
      apiRef.current?.goTo(v.pos, v.target);
    },
    fit(b) {
      const v = viewFor(b);
      apiRef.current?.goTo(v.pos, v.target);
    },
    focus(b) {
      const c = boundsCenter(b);
      apiRef.current?.focusTarget(new THREE.Vector3(c[0], c[1], c[2]).add(offset));
    },
    screenshot() {
      return glRef.current?.domElement.toDataURL("image/png") ?? null;
    },
  }));

  const initial = useMemo(() => {
    const c = boundsCenter(frame);
    const target = new THREE.Vector3(c[0], c[1], c[2]).add(offset);
    const dist = distanceFor(boundsRadius(frame), 35, 1.5);
    return { pos: target.clone().add(VIEW_DIR.clone().multiplyScalar(dist)), target };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ fov: 35, near: 0.1, far: 800, position: initial.pos.toArray() as Vec3 }}
      onCreated={({ gl, camera, size }) => {
        glRef.current = gl;
        camRef.current = camera as THREE.PerspectiveCamera;
        // Re-frame with the real aspect ratio (portrait phones need more distance).
        const aspect = size.width / Math.max(1, size.height);
        const dist = distanceFor(boundsRadius(frame), 35, aspect);
        camera.position.copy(initial.target.clone().add(VIEW_DIR.clone().multiplyScalar(dist)));
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={onPointerMissed}
    >
      <hemisphereLight args={[0xfffaf0, 0xd8cbb4, 1.5]} />
      <directionalLight
        position={[9, 16, 11]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.45} />
      <group position={offset}>
        {mat === "baseplate" ? (
          <Baseplate size={plateSize} />
        ) : (
          <>
            <mesh rotation-x={-Math.PI / 2} position={[center[0], -0.002, center[2]]} receiveShadow userData={{ ground: true }}>
              <circleGeometry args={[40, 64]} />
              <shadowMaterial opacity={0.12} />
            </mesh>
            <Grid
              position={[center[0], -0.004, center[2]]}
              args={[60, 60]}
              cellSize={1}
              cellThickness={0.6}
              cellColor="#E2D6C0"
              sectionSize={4}
              sectionThickness={0.9}
              sectionColor="#D3C3A6"
              fadeDistance={45}
              fadeStrength={1.5}
              infiniteGrid
            />
          </>
        )}
        {ready ? children : null}
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={initial.target}
        enableDamping
        dampingFactor={0.09}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        minDistance={3}
        maxDistance={120}
        maxPolarAngle={Math.PI * 0.495}
      />
      <CameraRig apiRef={apiRef} controlsRef={controlsRef} />
    </Canvas>
  );
});
