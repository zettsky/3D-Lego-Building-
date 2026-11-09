"use client";
/**
 * Custom Build scene: same Workspace + Brick views as Guided Build. Adds a pointer probe that
 * converts screen positions (mouse, touch or HTML drag-and-drop) into grid anchor cells.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { BrickInstance } from "@/engine/assembly";
import type { Candidate } from "@/engine/snapping";
import { Brick } from "@/engine/render/Brick";
import { GHOST_SAGE, GHOST_TERRACOTTA, makeGhostMaterial } from "@/engine/render/geometry";
import { Workspace, type WorkspaceHandle } from "@/engine/render/Workspace";
import type { Vec3 } from "@/engine/units";

export interface ProbeHit {
  anchor: { x: number; z: number } | null;
  uid: string | null;
}

export type ProbeFn = (clientX: number, clientY: number) => ProbeHit;

function Probe({ probeRef, center }: { probeRef: React.MutableRefObject<ProbeFn | null>; center: Vec3 }) {
  const { camera, scene, gl } = useThree();
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    probeRef.current = (cx, cy) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.userData?.uid || h.object.userData?.ground);
      if (!hit) return { anchor: null, uid: null };
      // local grid coordinates (Workspace offsets the model group by −center)
      const p = hit.point.clone().add(new THREE.Vector3(center[0], 0, center[2]));
      if (hit.object.userData.ground) return { anchor: { x: Math.floor(p.x), z: Math.floor(p.z) }, uid: null };
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      const q = n.y > 0.5 ? p.addScaledVector(n, -0.01) : p.addScaledVector(n, 0.5);
      return { anchor: { x: Math.floor(q.x), z: Math.floor(q.z) }, uid: hit.object.userData.uid as string };
    };
    return () => {
      probeRef.current = null;
    };
  }, [camera, scene, gl, center, probeRef]);
  return null;
}

export interface StudioSceneProps {
  bricks: BrickInstance[];
  candidate: Candidate | null;
  selected: string | null;
  hovered: string | null;
  plateSize: number;
  showGrid: boolean;
  probeRef: React.MutableRefObject<ProbeFn | null>;
  wsRef: React.Ref<WorkspaceHandle>;
}

export default function StudioScene({ bricks, candidate, selected, hovered, plateSize, showGrid, probeRef, wsRef }: StudioSceneProps) {
  const center = useMemo<Vec3>(() => [plateSize / 2, 0, plateSize / 2], [plateSize]);
  const frame = useMemo(() => ({ min: [0, 0, 0] as Vec3, max: [plateSize, 4, plateSize] as Vec3 }), [plateSize]);
  const okMat = useMemo(() => makeGhostMaterial(GHOST_SAGE, 0.5), []);
  const badMat = useMemo(() => makeGhostMaterial(GHOST_TERRACOTTA, 0.45), []);
  useEffect(() => () => { okMat.dispose(); badMat.dispose(); }, [okMat, badMat]);

  return (
    <Workspace ref={wsRef} center={center} frame={frame} mat="baseplate" plateSize={plateSize}>
      <Probe probeRef={probeRef} center={center} />
      {showGrid ? (
        <Grid
          position={[plateSize / 2, 0.215, plateSize / 2]}
          args={[plateSize, plateSize]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#9DA78A"
          sectionSize={4}
          sectionThickness={1}
          sectionColor="#77875F"
          fadeDistance={200}
        />
      ) : null}
      {bricks.map((b) => (
        <Brick
          key={b.uid}
          brick={b}
          outline={b.uid === selected ? "#C96B55" : b.uid === hovered ? "#8A7666" : null}
          selected={b.uid === selected}
        />
      ))}
      {candidate ? (
        <Brick
          brick={candidate.brick}
          material={candidate.valid ? okMat : badMat}
          outline={candidate.valid ? "#5F6E48" : "#A9523E"}
          castShadow={false}
          interactive={false}
        />
      ) : null}
    </Workspace>
  );
}
