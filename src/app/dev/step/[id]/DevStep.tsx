"use client";
/**
 * Development view for transcribing manuals: shows the model after a given step from the
 * manual's camera angle, with that step's new parts outlined. ?s=<manual step>&v=x,y,z
 */
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { resolveSet } from "@/lib/sets";
import { DEV_MODELS } from "@/data/sets/registry";

const Scene = dynamic(() => import("./DevScene"), { ssr: false });

function Inner({ id }: { id: string }) {
  const q = useSearchParams();
  const set = DEV_MODELS[id] ? { instruction: DEV_MODELS[id] } : resolveSet(id);
  if (!set?.instruction) return <p className="p-8">No instruction for {id}</p>;
  const steps = set.instruction.steps;
  const want = Number(q.get("s") ?? steps[steps.length - 1].manualStep ?? steps.length);
  let idx = steps.findIndex((s) => (s.manualStep ?? 0) >= want);
  if (idx < 0) idx = steps.length - 1;
  const view = (q.get("v") ?? "1,0.9,1").split(",").map(Number) as [number, number, number];
  const only = q.get("only") ?? undefined;
  return (
    <div className="flex h-dvh flex-col bg-[#868c90]">
      <div className="p-2 font-mono text-xs text-white">
        {id} · step {steps[idx].manualStep ?? idx + 1} (index {idx}) · page {steps[idx].page ?? "?"} · {steps[idx].bricks.length} new parts
      </div>
      <div className="min-h-0 flex-1">
        <Scene instruction={set.instruction} index={idx} view={view} only={only} />
      </div>
    </div>
  );
}

export default function DevStep({ id }: { id: string }) {
  return (
    <Suspense>
      <Inner id={id} />
    </Suspense>
  );
}
