"use client";
/**
 * Landing hero: a handful of bricks drift, then gently assemble into a tiny model,
 * rest, and drift apart again. Uses the shared Brick component and engine transforms.
 * Respects prefers-reduced-motion (shows the assembled model, still).
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { brickTransform, boundsCenter, sceneBounds } from "@/engine/assembly";
import { Brick } from "@/engine/render/Brick";
import { HERO_BRICKS } from "@/data/models";

const CYCLE = 11; // seconds
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Assembly() {
  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const center = useMemo(() => boundsCenter(sceneBounds(HERO_BRICKS)), []);
  const scatter = useMemo(
    () =>
      HERO_BRICKS.map((_, i) => {
        const a = (i / HERO_BRICKS.length) * Math.PI * 2 + 0.6;
        return { dx: Math.cos(a) * 3.4, dy: 1.4 + (i % 3) * 1.1, dz: Math.sin(a) * 2.6, spin: (i % 2 ? 1 : -1) * 0.9, phase: i * 0.9 };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) root.current.rotation.y = reduced ? -0.5 : -0.5 + Math.sin(t * 0.25) * 0.35;
    HERO_BRICKS.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const base = brickTransform(b).position;
      let k = 1; // 1 = assembled
      if (!reduced) {
        const c = (t % CYCLE) / CYCLE;
        const stagger = i * 0.02;
        if (c < 0.3) k = 0;
        else if (c < 0.55) k = ease(Math.min(1, Math.max(0, (c - 0.3 - stagger) / 0.15)));
        else if (c < 0.85) k = 1;
        else k = 1 - ease((c - 0.85) / 0.15);
      }
      const s = scatter[i];
      const bob = reduced ? 0 : Math.sin(t * 1.3 + s.phase) * 0.12 * (1 - k);
      g.position.set(base[0] + s.dx * (1 - k), base[1] + (s.dy + bob) * (1 - k), base[2] + s.dz * (1 - k));
      g.rotation.y = s.spin * (1 - k);
    });
  });

  return (
    <group ref={root}>
      <group position={[-center[0], 0, -center[2]]}>
        {HERO_BRICKS.map((b, i) => (
          <Brick key={b.uid} brick={b} interactive={false} ref={(g) => { refs.current[i] = g; }} />
        ))}
      </group>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 30, position: [9, 9, 11] }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        camera.lookAt(0, 1.7, 0);
      }}
      aria-label="Bricks gently assembling into a small model"
    >
      <hemisphereLight args={[0xfffaf0, 0xd8cbb4, 1.6]} />
      <directionalLight position={[6, 12, 8]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
      <Assembly />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[8, 48]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
    </Canvas>
  );
}
