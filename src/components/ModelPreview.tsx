"use client";
import { useMemo } from "react";
import { allBricks, type Instruction } from "@/engine/instructions";
import { boundsCenter } from "@/engine/assembly";
import { FrameRig, InstancedBricks } from "@/engine/render/Frames";
import { frameMap, worldBounds } from "@/engine/frames";
import { Workspace } from "@/engine/render/Workspace";

/** Rotating 3D preview of a complete model (sub-assemblies in their final places). */
export default function ModelPreview({ instruction }: { instruction: Instruction }) {
  const bricks = useMemo(() => allBricks(instruction), [instruction]);
  const frame = useMemo(() => worldBounds(bricks, frameMap(instruction.frames)), [bricks, instruction]);
  const center = useMemo(() => boundsCenter(frame), [frame]);
  return (
    <Workspace center={center} frame={frame} autoRotate>
      <FrameRig frames={instruction.frames} step={Infinity} instant>
        <InstancedBricks bricks={bricks} />
      </FrameRig>
    </Workspace>
  );
}
