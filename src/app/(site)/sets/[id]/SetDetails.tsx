"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { SetEntry } from "@/data/catalog";
import { resolveSet } from "@/lib/sets";
import { getPace, getProgress, setPace as storePace, type GuidedProgress } from "@/lib/storage";
import { estimateFromPieceCount, formatRange, PACE_LABEL, remainingEstimate, type Pace } from "@/engine/estimate";
import { instructionInventory } from "@/engine/instructions";
import { getPart } from "@/engine/parts";
import { getColor } from "@/engine/colors";
import { SetCover } from "@/components/SetCard";
import { PartThumb } from "@/components/Thumb";
import { StatusTag, Strip, Tag } from "@/components/ui";
import { IconBack, IconClock, Sparkle } from "@/components/icons";

const ModelPreview = dynamic(() => import("@/components/ModelPreview"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-cream/40" /> });

export function SetDetails({ id }: { id: string }) {
  const [set, setSet] = useState<SetEntry | null | undefined>(undefined);
  const [pace, setPaceState] = useState<Pace>("standard");
  const [progress, setProgress] = useState<GuidedProgress | null>(null);

  useEffect(() => {
    setSet(resolveSet(id) ?? null);
    setPaceState(getPace());
    setProgress(getProgress(id));
  }, [id]);

  if (set === undefined) return <div className="mx-auto h-[60vh] max-w-6xl" />;
  if (set === null)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Set not found</h1>
        <p className="text-ink-soft/80">This set isn’t in the catalog (or the upload lives in another browser).</p>
        <Link href="/explore" className="btn btn-primary">Explore sets</Link>
      </div>
    );

  const interactive = set.status === "interactive" && set.instruction;
  const est = set.instruction ? remainingEstimate(set.instruction, -1, pace) : estimateFromPieceCount(set.pieces, pace);
  const inventory = set.instruction ? instructionInventory(set.instruction).sort((a, b) => b.qty - a.qty) : [];

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <Link href="/explore" className="label mb-6 inline-flex items-center gap-1 text-dust hover:text-ink">
        <IconBack size={14} /> All sets
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        {/* Booklet-style preview */}
        <div className="relative overflow-hidden rounded-[1.6rem] border-[1.5px] border-ink bg-card shadow-[6px_6px_0_#252522]">
          <div className="flex items-center justify-between border-b border-dashed border-rule px-5 py-3">
            <span className="label text-dust">No. {set.setNumber}</span>
            <span className="label text-dust">{interactive ? "drag to rotate · scroll to zoom" : "preview unavailable"}</span>
          </div>
          <div className="paper aspect-[5/4] w-full">
            {interactive ? (
              <ModelPreview instruction={set.instruction!} />
            ) : (
              <div className="grid h-full place-items-center p-10">
                <SetCover set={set} className="aspect-square w-2/3" />
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-8 h-16 w-5 bg-terracotta [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="label inline-flex items-center gap-2 text-terracotta">
              <Sparkle size={10} /> {set.theme}
              {set.collection ? ` · ${set.collection}` : ""}
            </span>
            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{set.name}</h1>
            <div className="flex flex-wrap gap-2">
              <StatusTag interactive={!!interactive} />
              {set.official ? <Tag>{set.instruction ? "Official set · from its manual" : "Official set · catalog data"}</Tag> : <Tag tone="terracotta">Tsumiki original</Tag>}
            </div>
          </div>
          <p className="leading-relaxed text-ink-soft/85">{set.description}</p>
          {set.coverage ? (
            <p className="rounded-xl border border-dashed border-terracotta/50 bg-terracotta/5 p-3 text-sm leading-relaxed text-ink-soft">
              <span className="label mb-1 block !text-[0.6rem] text-terracotta">What’s modelled</span>
              {set.coverage}
            </p>
          ) : null}

          <dl className="grid grid-cols-3 overflow-hidden rounded-xl border-[1.5px] border-ink bg-card text-center">
            {[
              ["Pieces", set.modelPieces ? `${set.modelPieces} / ${set.pieces}` : set.pieces.toLocaleString()],
              ["Steps", set.instruction ? String(set.instruction.steps.length) : "—"],
              ["Number", set.setNumber],
            ].map(([k, v]) => (
              <div key={k} className="border-r border-dashed border-rule p-3 last:border-r-0">
                <dt className="label !text-[0.58rem] text-dust">{k}</dt>
                <dd className="font-serif text-2xl">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="dashed-ticket flex flex-col gap-3 rounded-xl bg-card/60 p-4">
            <div className="flex items-center gap-2">
              <IconClock size={16} className="text-dust" />
              <span className="font-serif text-xl">{formatRange(est)}</span>
              <Tag>predicted</Tag>
            </div>
            <p className="text-xs text-dust">{est.basis}</p>
            <div className="flex items-center gap-1 rounded-full border border-ink/20 bg-paper p-1" role="radiogroup" aria-label="Building pace">
              {(Object.keys(PACE_LABEL) as Pace[]).map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={pace === p}
                  onClick={() => {
                    setPaceState(p);
                    storePace(p);
                  }}
                  className={`flex-1 rounded-full px-3 py-1.5 text-sm transition-all ${pace === p ? "bg-ink text-card" : "hover:bg-cream"}`}
                >
                  {PACE_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {interactive ? (
            <div className="flex flex-wrap gap-3">
              <Link href={`/build/${set.id}`} className="btn btn-primary text-base">
                {progress ? `Resume at step ${progress.step + 1}` : "Start Building"}
              </Link>
              <Link href={`/studio/${set.id}`} className="btn btn-secondary text-base">
                Create Your Own
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-rule bg-cream/40 p-4 text-sm text-ink-soft">
              <p>
                Interactive instructions and the brick inventory for this set haven’t been processed, so building isn’t available yet. We
                won’t invent geometry we can’t verify.
              </p>
              <Link href="/upload" className="btn btn-secondary self-start text-sm">
                Import an LDraw model instead
              </Link>
            </div>
          )}
        </div>
      </div>

      {inventory.length ? (
        <section className="mt-16">
          <Strip className="mb-6">Parts in this set</Strip>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {inventory.map((l) => (
              <li key={`${l.partId}|${l.colorId}`} className="flex flex-col items-center gap-1 rounded-xl border border-rule bg-card p-3 text-center">
                <PartThumb partId={l.partId} colorId={l.colorId} size={64} className="h-16 w-16" />
                <span className="font-serif text-lg leading-none">×{l.qty}</span>
                <span className="text-xs text-ink-soft">{getPart(l.partId).name}</span>
                <span className="label !text-[0.55rem] text-dust">{getColor(l.colorId).name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
