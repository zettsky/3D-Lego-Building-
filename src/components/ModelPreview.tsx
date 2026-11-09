"use client";
import { useMemo } from "react";
import { allBricks, type Instruction } from "@/engine/instructions";
import { boundsCenter, sceneBounds } from "@/engine/assembly";
import { Brick } from "@/engine/render/Brick";
import { Workspace } from "@/engine/render/Workspace";

/** Rotating 3D preview of a complete, verified model. */
export default function ModelPreview({ instruction }: { instruction: Instruction }) {
  const bricks = useMemo(() => allBricks(instruction), [instruction]);
  const frame = useMemo(() => sceneBounds(bricks), [bricks]);
  const center = useMemo(() => boundsCenter(frame), [frame]);
  return (
    <Workspace center={center} frame={frame} autoRotate>
      {bricks.map((b) => (
        <Brick key={b.uid} brick={b} interactive={false} />
      ))}
    </Workspace>
  );
}
