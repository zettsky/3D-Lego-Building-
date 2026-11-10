"use client";
/**
 * Scene-side sub-assemblies. FrameRig owns one THREE.Group per frame (nested like the
 * frames themselves) and eases each group toward its transform for the current step, so a
 * sub-build glides from its staging spot into place on its attach step. Bricks are put into
 * their frame's group with <InFrame>, which portals them there; nothing about a brick's
 * own animation changes.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { frameLocalAt, frameOrder, type FrameDef, type FrameTransform } from "../frames";
import { brickTransform, type BrickInstance } from "../assembly";
import { brickMaterial, partGeometry, printOverlay } from "./geometry";
import { getPart } from "../parts";

const FrameCtx = createContext<Map<string, THREE.Group>>(new Map());

const quat = (t: FrameTransform) => new THREE.Quaternion().setFromEuler(new THREE.Euler(t.rotation[0], t.rotation[1], t.rotation[2], "XYZ"));

export function FrameRig({ frames, step, children, instant = false }: { frames?: FrameDef[]; step: number; children: ReactNode; instant?: boolean }) {
  const { root, groups, ordered } = useMemo(() => {
    const root = new THREE.Group();
    const groups = new Map<string, THREE.Group>();
    const ordered = frameOrder(frames ?? []);
    for (const f of ordered) {
      const g = new THREE.Group();
      g.name = `frame:${f.id}`;
      groups.set(f.id, g);
      (f.parent ? groups.get(f.parent)! : root).add(g);
    }
    return { root, groups, ordered };
  }, [frames]);

  const snapped = useRef(false);
  useLayoutEffect(() => {
    snapped.current = false;
  }, [root]);

  useFrame((_, dt) => {
    const k = instant || !snapped.current ? 1 : 1 - Math.exp(-dt * 3.2);
    for (const f of ordered) {
      const g = groups.get(f.id)!;
      const t = frameLocalAt(f, step);
      g.position.lerp(new THREE.Vector3(...t.position), k);
      g.quaternion.slerp(quat(t), k);
    }
    snapped.current = true;
  });

  return (
    <>
      <primitive object={root} />
      <FrameCtx.Provider value={groups}>{children}</FrameCtx.Provider>
    </>
  );
}

export function InFrame({ id, children }: { id?: string; children: ReactNode }) {
  const groups = useContext(FrameCtx);
  if (!id) return <>{children}</>;
  const g = groups.get(id);
  return g ? <>{createPortal(children, g)}</> : null;
}

/** Group bricks by frame (undefined = main model). */
export function byFrame(bricks: BrickInstance[]): [string | undefined, BrickInstance[]][] {
  const m = new Map<string, BrickInstance[]>();
  for (const b of bricks) {
    const k = b.frame ?? "";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(b);
  }
  return [...m.entries()].map(([k, v]) => [k || undefined, v]);
}

/** One draw call per part + colour: used for the (often large) set of already-placed bricks. */
function InstancedBatch({ partId, colorId, bricks }: { partId: string; colorId: string; bricks: BrickInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    bricks.forEach((b, i) => {
      const t = brickTransform(b);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotationY);
      m.compose(new THREE.Vector3(...t.position), q, one);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bricks]);
  const print = printOverlay(partId);
  return (
    <>
      <instancedMesh ref={ref} args={[partGeometry(partId), brickMaterial(colorId), bricks.length]} castShadow receiveShadow raycast={() => null} />
      {print
        ? bricks.map((b) => {
            const t = brickTransform(b);
            return <mesh key={b.uid} geometry={print.geometry} material={print.material} position={t.position} rotation-y={t.rotationY} raycast={() => null} />;
          })
        : null}
    </>
  );
}

export function InstancedBricks({ bricks }: { bricks: BrickInstance[] }) {
  const groups = useMemo(() => {
    return byFrame(bricks).map(([frame, list]) => {
      const batches = new Map<string, BrickInstance[]>();
      for (const b of list) {
        const k = `${b.partId}|${b.colorId}`;
        if (!batches.has(k)) batches.set(k, []);
        batches.get(k)!.push(b);
      }
      return { frame, batches: [...batches.entries()] };
    });
  }, [bricks]);
  useEffect(() => {
    // touch part defs early so unknown ids fail loudly in development
    for (const b of bricks) getPart(b.partId);
  }, [bricks]);
  return (
    <>
      {groups.map(({ frame, batches }) => (
        <InFrame key={frame ?? "_"} id={frame}>
          {batches.map(([k, list]) => {
            const [partId, colorId] = k.split("|");
            return <InstancedBatch key={`${k}:${list.length}:${list[0].uid}`} partId={partId} colorId={colorId} bricks={list} />;
          })}
        </InFrame>
      ))}
    </>
  );
}
