"use client";
/**
 * Guided Build scene. Everything visual here is a *view* of:
 *   assemblyAt(step − 1)  → static bricks
 *   steps[step]           → animated / exploded bricks (visual offsets only)
 *   steps[step + 1]       → ghost previews
 * No brick position is ever mutated in the authoritative data.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { boundsCenter, brickTransform, sceneBounds, type BrickInstance } from "@/engine/assembly";
import { assemblyAt, allBricks, type Instruction } from "@/engine/instructions";
import { explodeVectors } from "@/engine/explode";
import { ghostVisible, type GuidedState } from "@/engine/guidedMachine";
import { Brick } from "@/engine/render/Brick";
import { GHOST_SAGE, GHOST_TERRACOTTA, makeGhostMaterial } from "@/engine/render/geometry";
import { Workspace, type WorkspaceHandle } from "@/engine/render/Workspace";
import { PLATE } from "@/engine/units";
import { getPart } from "@/engine/parts";

const STAGGER = 0.16;
const DURATION = 0.75;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

const StaticBricks = memo(function StaticBricks({ bricks }: { bricks: BrickInstance[] }) {
  return (
    <>
      {bricks.map((b) => (
        <Brick key={b.uid} brick={b} interactive={false} />
      ))}
    </>
  );
});

function StepBricks({
  previous,
  bricks,
  state,
  onAnimDone,
  reduced,
}: {
  previous: BrickInstance[];
  bricks: BrickInstance[];
  state: GuidedState;
  onAnimDone: (token: number) => void;
  reduced: boolean;
}) {
  const refs = useRef(new Map<string, THREE.Group>());
  const vectors = useMemo(() => explodeVectors(previous, bricks), [previous, bricks]);
  const order = useMemo(() => [...bricks].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x), [bricks]);
  const bases = useMemo(() => new Map(bricks.map((b) => [b.uid, brickTransform(b).position])), [bricks]);
  const anim = useRef<{ token: number; start: number | null; reported: boolean }>({ token: -1, start: null, reported: false });
  const shown = useRef(0); // displayed explode amount (smoothed)

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    const a = anim.current;
    if (a.token !== state.animToken) {
      a.token = state.animToken;
      a.start = state.animating ? t : null;
      a.reported = false;
    }
    const target = state.exploded ? state.explodeAmount : 0;
    shown.current += (target - shown.current) * (reduced ? 1 : 1 - Math.exp(-dt * 8));
    if (Math.abs(target - shown.current) < 1e-3) shown.current = target;

    const total = (order.length - 1) * STAGGER + DURATION;
    const elapsed = a.start === null ? Infinity : (t - a.start) * state.speed;

    order.forEach((b, i) => {
      const g = refs.current.get(b.uid);
      if (!g) return;
      const base = bases.get(b.uid)!;
      const v = vectors.get(b.uid) ?? [0, 2, 0];
      if (state.animating && !reduced && elapsed !== Infinity) {
        const p = clamp01((elapsed - i * STAGGER) / DURATION);
        g.visible = p > 0;
        // approach (0–80 %): glide in along the assembly direction, untwisting;
        // snap (80–100 %): settle the last millimetre onto the studs.
        const approach = easeOut(clamp01(p / 0.8));
        const snap = clamp01((p - 0.8) / 0.2);
        const hover = 0.14 * (1 - snap * snap);
        g.position.set(base[0] + v[0] * (1 - approach), base[1] + v[1] * (1 - approach) + hover * (p > 0 ? 1 : 0), base[2] + v[2] * (1 - approach));
        g.rotation.y = 0.45 * (1 - approach);
      } else {
        g.visible = true;
        const k = shown.current;
        g.position.set(base[0] + v[0] * k, base[1] + v[1] * k, base[2] + v[2] * k);
        g.rotation.y = 0;
      }
    });

    if (state.animating && !a.reported && (reduced || elapsed >= total)) {
      a.reported = true;
      onAnimDone(state.animToken);
    }
  });

  const guides = state.exploded
    ? bricks.map((b) => {
        const base = bases.get(b.uid)!;
        const v = vectors.get(b.uid)!;
        const top = getPart(b.partId).h * PLATE;
        const from: [number, number, number] = [base[0], base[1] + top, base[2]];
        const to: [number, number, number] = [base[0] + v[0] * state.explodeAmount, base[1] + v[1] * state.explodeAmount, base[2] + v[2] * state.explodeAmount];
        return { uid: b.uid, from, to };
      })
    : [];

  return (
    <>
      {bricks.map((b) => (
        <Brick
          key={b.uid}
          brick={b}
          interactive={false}
          outline={state.exploded ? "#C96B55" : null}
          ref={(g) => {
            if (g) refs.current.set(b.uid, g);
            else refs.current.delete(b.uid);
          }}
        />
      ))}
      {guides.map((g) =>
        Math.hypot(g.to[0] - g.from[0], g.to[1] - g.from[1], g.to[2] - g.from[2]) > 0.3 ? (
          <Line key={g.uid} points={[g.from, g.to]} color="#8A7666" lineWidth={1} dashed dashSize={0.12} gapSize={0.1} transparent opacity={0.7} />
        ) : null,
      )}
    </>
  );
}

function GhostBricks({ bricks, visible }: { bricks: BrickInstance[]; visible: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => makeGhostMaterial(GHOST_SAGE, 0), []);
  const hot = useMemo(() => makeGhostMaterial(GHOST_TERRACOTTA, 0), []);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => () => { mat.dispose(); hot.dispose(); }, [mat, hot]);
  useEffect(() => setHovered(null), [bricks]);

  useFrame((_, dt) => {
    const target = visible ? 0.4 : 0;
    const k = 1 - Math.exp(-dt * 7);
    mat.opacity += (target - mat.opacity) * k;
    hot.opacity = Math.min(0.7, mat.opacity * 1.6);
    if (group.current) group.current.visible = mat.opacity > 0.01;
  });

  return (
    <group ref={group}>
      {bricks.map((b) => (
        <Brick
          key={b.uid}
          brick={b}
          material={hovered === b.uid ? hot : mat}
          outline={visible ? (hovered === b.uid ? "#A9523E" : "#77875F") : null}
          castShadow={false}
          interactive={visible}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(b.uid);
          }}
          onPointerOut={() => setHovered((h) => (h === b.uid ? null : h))}
        />
      ))}
    </group>
  );
}

export interface GuidedSceneProps {
  instruction: Instruction;
  state: GuidedState;
  onAnimDone: (token: number) => void;
  wsRef: React.Ref<WorkspaceHandle>;
}

export default function GuidedScene({ instruction, state, onAnimDone, wsRef }: GuidedSceneProps) {
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const full = useMemo(() => sceneBounds(allBricks(instruction)), [instruction]);
  const center = useMemo(() => boundsCenter(full), [full]);
  const previous = useMemo(() => assemblyAt(instruction, state.step - 1), [instruction, state.step]);
  const current = instruction.steps[state.step]?.bricks ?? [];
  const next = instruction.steps[state.step + 1]?.bricks ?? [];

  return (
    <Workspace ref={wsRef} center={center} frame={full}>
      <StaticBricks bricks={previous} />
      <StepBricks previous={previous} bricks={current} state={state} onAnimDone={onAnimDone} reduced={reduced} />
      <GhostBricks bricks={next} visible={ghostVisible(state)} />
    </Workspace>
  );
}
