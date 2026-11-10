"use client";
import Link from "next/link";
import type { SetEntry } from "@/data/catalog";
import { allBricks } from "@/engine/instructions";
import { estimateFromPieceCount, formatRange, remainingEstimate } from "@/engine/estimate";
import { Thumb } from "./Thumb";
import { StatusTag } from "./ui";

export function setEstimate(s: SetEntry) {
  return s.instruction ? remainingEstimate(s.instruction, -1, "standard") : estimateFromPieceCount(s.pieces);
}

/** Cover: real 3D render for verified models; a drawn placeholder otherwise (no official images bundled). */
export function SetCover({ set, size = 280, className = "" }: { set: SetEntry; size?: number; className?: string }) {
  if (set.instruction)
    return <Thumb id={`set:${set.id}`} bricks={allBricks(set.instruction)} frames={set.instruction.frames} size={size} alt={`3D render of ${set.name}`} className={className} />;
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-xl border border-dashed border-dust/50 bg-cream/40 ${className}`}>
      <svg viewBox="0 0 120 90" className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden="true">
        <path d="M20 55 60 35l40 20v15L60 90 20 70z" fill="none" stroke="#252522" strokeWidth="1" strokeDasharray="3 3" />
        <path d="M20 55 60 75l40-20M60 75v15" fill="none" stroke="#252522" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span className="font-serif text-3xl tracking-tight text-ink/80">{set.setNumber}</span>
        <span className="label !text-[0.55rem] text-dust">image not displayed</span>
      </div>
    </div>
  );
}

export function SetCard({ set }: { set: SetEntry }) {
  const est = setEstimate(set);
  return (
    <Link
      href={`/sets/${set.id}`}
      className="lift group flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink/80 bg-card shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-[4/3] border-b border-dashed border-rule bg-[linear-gradient(to_right,rgb(180_160_125/.12)_1px,transparent_1px),linear-gradient(to_bottom,rgb(180_160_125/.12)_1px,transparent_1px)] bg-[size:16px_16px] p-4">
        <SetCover set={set} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="label absolute left-3 top-3 rounded bg-card/90 px-1.5 py-0.5 !text-[0.58rem] text-dust">No. {set.setNumber}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="label !text-[0.58rem] text-dust">
          {set.theme}
          {set.collection ? ` · ${set.collection}` : ""}
        </span>
        <h3 className="font-serif text-xl leading-snug">{set.name}</h3>
        <div className="label mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 !text-[0.6rem] text-ink-soft">
          <span>{set.pieces.toLocaleString()} pcs</span>
          <span className="text-rule">/</span>
          <span title={est.basis}>{formatRange(est)} · predicted</span>
        </div>
        <div className="pt-1">
          <StatusTag interactive={set.status === "interactive"} />
        </div>
      </div>
    </Link>
  );
}
