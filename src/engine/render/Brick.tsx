"use client";
/**
 * The single brick view used everywhere (Guided, Custom, ghosts, hero, set preview).
 * Solid and ghost bricks share the exact same geometry and transform logic.
 */
import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { brickTransform, type BrickInstance } from "../assembly";
import { partGeometry, partMaterial, printOverlay } from "./geometry";

export interface BrickProps {
  brick: BrickInstance;
  /** Overrides the colour material (ghost previews, highlights). */
  material?: THREE.Material;
  outline?: string | null;
  selected?: boolean;
  castShadow?: boolean;
  interactive?: boolean;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

const noRaycast = () => null;

export const Brick = forwardRef<THREE.Group, BrickProps>(function Brick(
  { brick, material, outline, selected, castShadow = true, interactive = true, onPointerOver, onPointerOut },
  ref,
) {
  const { position, rotationY, quaternion } = useMemo(() => brickTransform(brick), [brick]);
  const geometry = partGeometry(brick.partId);
  const print = printOverlay(brick.partId);
  return (
    <group ref={ref} position={position}>
      <mesh
        geometry={geometry}
        material={material ?? partMaterial(brick.partId, brick.colorId)}
        rotation-y={quaternion ? 0 : rotationY}
        quaternion={quaternion}
        castShadow={castShadow}
        receiveShadow
        userData={{ uid: brick.uid }}
        raycast={interactive ? undefined : noRaycast}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        {outline ? <Edges threshold={30} color={outline} lineWidth={selected ? 2 : 1} /> : null}
      </mesh>
      {print && !material ? <mesh geometry={print.geometry} material={print.material} rotation-y={quaternion ? 0 : rotationY} quaternion={quaternion} raycast={noRaycast} /> : null}
    </group>
  );
});
