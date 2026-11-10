"use client";
import { useMemo } from "react";
import { boundsCenter } from "@/engine/assembly";
import { assemblyAt, boundsAt, type Instruction } from "@/engine/instructions";
import { Brick } from "@/engine/render/Brick";
import { FrameRig, InFrame, InstancedBricks } from "@/engine/render/Frames";
import { Workspace } from "@/engine/render/Workspace";

export default function DevScene({ instruction, index, view, only }: { instruction: Instruction; index: number; view: [number, number, number]; only?: string }) {
  const prev = useMemo(() => assemblyAt(instruction, index - 1).filter((b) => !only || b.frame === only), [instruction, index, only]);
  const cur = useMemo(() => instruction.steps[index].bricks.filter((b) => !only || b.frame === only), [instruction, index, only]);
  const box = useMemo(() => boundsAt(instruction, index, [...prev, ...cur]), [instruction, index, prev, cur]);
  const center = useMemo(() => boundsCenter(box), [box]);
  return (
    <Workspace center={center} frame={box} view={view} key={`${index}-${only}`}>
      <FrameRig frames={instruction.frames} step={index} instant>
        <InstancedBricks bricks={prev} />
        {cur.map((b) => (
          <InFrame key={b.uid} id={b.frame}>
            <Brick brick={b} interactive={false} outline="#F2C200" />
          </InFrame>
        ))}
      </FrameRig>
    </Workspace>
  );
}
