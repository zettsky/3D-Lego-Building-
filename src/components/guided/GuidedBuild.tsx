"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SetEntry } from "@/data/catalog";
import { resolveSet } from "@/lib/sets";
import { clearProgress, getPace, getProgress, saveProgress } from "@/lib/storage";
import { guidedReducer, initGuided, progressPct, type GuidedState, type Speed } from "@/engine/guidedMachine";
import { boundsAt, stepCallout, type Instruction } from "@/engine/instructions";
import { formatRange, remainingEstimate, type Pace } from "@/engine/estimate";
import { getPart } from "@/engine/parts";
import { getColor } from "@/engine/colors";
import type { WorkspaceHandle } from "@/engine/render/Workspace";
import { PartThumb } from "@/components/Thumb";
import {
  IconBack, IconClock, IconClose, IconExplode, IconFit, IconGhost, IconNext, IconPanel, IconPause, IconPlay, IconPrev, IconReplay, IconResetView, Sparkle,
} from "@/components/icons";

const GuidedScene = dynamic(() => import("./GuidedScene"), { ssr: false, loading: () => <SceneLoading /> });

function SceneLoading() {
  return (
    <div className="grid h-full place-items-center">
      <span className="label animate-pulse text-dust">Laying out the bricks…</span>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(3, "0");

export function GuidedBuild({ id }: { id: string }) {
  const [set, setSet] = useState<SetEntry | null | undefined>(undefined);
  useEffect(() => setSet(resolveSet(id) ?? null), [id]);
  if (set === undefined) return <div className="h-dvh" />;
  if (!set || !set.instruction)
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-3xl">No interactive instructions for this set yet.</h1>
        <Link href={set ? `/sets/${set.id}` : "/explore"} className="btn btn-primary">Back</Link>
      </div>
    );
  return <GuidedBuilder set={set} instruction={set.instruction} />;
}

function GuidedBuilder({ set, instruction }: { set: SetEntry; instruction: Instruction }) {
  const total = instruction.steps.length;
  const [state, dispatch] = useReducer(guidedReducer, undefined, () => initGuided(total, 0));
  const [pace, setPace] = useState<Pace>("standard");
  const [panelOpen, setPanelOpen] = useState(false);
  const ws = useRef<WorkspaceHandle>(null);
  const restored = useRef(false);

  // Resume saved progress once.
  useEffect(() => {
    setPace(getPace());
    const p = getProgress(set.id);
    if (p && p.step > 0 && p.step < total) dispatch({ type: "GOTO", step: p.step });
    restored.current = true;
  }, [set.id, total]);

  useEffect(() => {
    if (!restored.current) return;
    saveProgress({ setId: set.id, step: state.step, total, updatedAt: Date.now() });
  }, [state.step, set.id, total]);

  // Automatic progression.
  useEffect(() => {
    if (!state.playing || state.animating) return;
    if (state.step >= total - 1) {
      dispatch({ type: "PAUSE" });
      return;
    }
    const t = window.setTimeout(() => dispatch({ type: "NEXT" }), 1100 / state.speed);
    return () => window.clearTimeout(t);
  }, [state.playing, state.animating, state.step, state.speed, total]);

  // Suggest a camera focus for each step without taking control away.
  useEffect(() => {
    const bricks = instruction.steps[state.step]?.bricks;
    if (bricks?.length) ws.current?.focus(boundsAt(instruction, state.step, instruction.frames?.length ? bricks : undefined));
  }, [state.step, instruction]);

  const onAnimDone = useCallback((token: number) => dispatch({ type: "ANIM_DONE", token }), []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select")) return;
      const map: Record<string, () => void> = {
        ArrowRight: () => dispatch({ type: "NEXT" }),
        ArrowLeft: () => dispatch({ type: "PREV" }),
        " ": () => dispatch({ type: "TOGGLE_PLAY" }),
        r: () => dispatch({ type: "REPLAY" }),
        g: () => dispatch({ type: "TOGGLE_GHOST" }),
        e: () => dispatch({ type: "TOGGLE_EXPLODE" }),
        f: () => ws.current?.fit(boundsAt(instruction, state.step)),
        "0": () => ws.current?.reset(),
      };
      const fn = map[e.key];
      if (fn && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [instruction, state.step]);

  const completedThrough = state.animating ? state.step - 1 : state.step;
  const est = remainingEstimate(instruction, completedThrough, pace);
  const pct = progressPct(state);
  const finished = state.step === total - 1 && !state.animating;
  const callout = useMemo(() => stepCallout(instruction.steps[state.step]), [instruction, state.step]);
  const note = instruction.steps[state.step]?.note;

  return (
    <div className="paper-plain fixed inset-0 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="z-20 flex items-center gap-3 border-b border-rule bg-paper/80 px-3 py-2.5 backdrop-blur-sm sm:px-5">
        <Link href={`/sets/${set.id}`} className="tool" aria-label="Back to set">
          <IconBack />
        </Link>
        <div className="flex min-w-0 flex-col">
          <span className="label !text-[0.58rem] text-dust">Guided build · No. {set.setNumber}</span>
          <span className="truncate font-serif text-lg leading-tight">{set.name}</span>
        </div>
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <span className="label text-dust">
            Step {state.step + 1} / {total}
          </span>
          <div className="h-2 w-40 overflow-hidden rounded-full border border-ink/70 bg-card" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Build progress">
            <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="label w-9 text-right">{pct}%</span>
        </div>
        <button className="tool lg:hidden" aria-label="Show step pieces" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
          <IconPanel />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Left panel — current step */}
        <aside
          className={`absolute inset-y-0 left-0 z-20 w-[300px] max-w-[85vw] transform border-r border-rule bg-paper/95 backdrop-blur-sm transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-transparent lg:backdrop-blur-none ${panelOpen ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Current step"
        >
          <div className="scroll-thin flex h-full flex-col gap-5 overflow-y-auto p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="label text-terracotta">Step</span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={state.step}
                    initial={{ opacity: 0, y: 10, rotateX: -40 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -10, rotateX: 40 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="font-serif text-[4.2rem] font-light leading-[0.9] tracking-tight"
                  >
                    {pad(state.step + 1)}
                  </motion.div>
                </AnimatePresence>
                <span className="label text-dust">of {pad(total)}</span>
                {instruction.steps[state.step]?.manualStep ? (
                  <span className="label mt-1 block !text-[0.58rem] text-terracotta">
                    Manual step {instruction.steps[state.step].manualStep}
                    {instruction.steps[state.step].page ? ` · page ${instruction.steps[state.step].page}` : ""}
                  </span>
                ) : null}
              </div>
              <button className="tool lg:hidden" aria-label="Close panel" onClick={() => setPanelOpen(false)}>
                <IconClose />
              </button>
            </div>

            <div className="rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[3px_3px_0_#252522]">
              <div className="mb-3 flex items-center justify-between">
                <span className="label">Pieces this step</span>
                <span className="label text-dust">{callout.reduce((s, l) => s + l.qty, 0)} pcs</span>
              </div>
              {!callout.length ? <p className="text-sm text-ink-soft">No new pieces: this step attaches a part you built earlier.</p> : null}
              <ul className="grid grid-cols-2 gap-2">
                {callout.map((l) => (
                  <li key={`${l.partId}|${l.colorId}`} className="flex items-center gap-2 rounded-lg bg-paper/70 p-1.5" title={`${getPart(l.partId).name} — ${getColor(l.colorId).name}`}>
                    <PartThumb partId={l.partId} colorId={l.colorId} size={44} className="h-11 w-11 shrink-0" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-serif text-lg leading-none">×{l.qty}</span>
                      <span className="truncate text-[0.68rem] text-ink-soft">{getPart(l.partId).name}</span>
                      <span className="label truncate !text-[0.5rem] text-dust">{getColor(l.colorId).name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {note ? (
              <div className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                <Sparkle size={12} className="mt-1 shrink-0 text-terracotta" />
                <p>{note}</p>
              </div>
            ) : null}

            <div className="mt-auto flex flex-col gap-2 text-xs text-dust">
              <span className="label !text-[0.55rem]">Shortcuts</span>
              <span>← → steps · Space play · R replay · G ghost · E explode · F fit · 0 reset view</span>
              <span>
                Instructions:{" "}
                {instruction.provenance === "hand-authored"
                  ? "hand-authored, geometry-validated"
                  : instruction.provenance === "manual-transcription"
                    ? "transcribed from the official manual, geometry-validated"
                    : "LDraw import, geometry-validated"}
              </span>
            </div>
          </div>
        </aside>

        {/* Center — 3D workspace */}
        <section className="relative min-w-0 flex-1" aria-label="3D model workspace. Drag to rotate, scroll to zoom, right-drag to pan.">
          <GuidedScene instruction={instruction} state={state} onAnimDone={onAnimDone} wsRef={ws} />

          {/* Right floating toolbar */}
          <div className="absolute right-3 top-3 flex flex-col gap-2 sm:right-5 sm:top-5" role="toolbar" aria-label="View tools">
            <button className="tool" aria-label="Reset camera (0)" title="Reset camera (0)" onClick={() => ws.current?.reset()}>
              <IconResetView />
            </button>
            <button className="tool" aria-label="Fit model (F)" title="Fit model (F)" onClick={() => ws.current?.fit(boundsAt(instruction, state.step))}>
              <IconFit />
            </button>
            <div className="my-1 h-px bg-rule" />
            <button
              className="tool"
              aria-pressed={state.ghostPref}
              aria-label="Ghost Mode — preview next step (G)"
              title={state.step >= total - 1 ? "Ghost Mode (no next step)" : "Ghost Mode — preview next step (G)"}
              onClick={() => dispatch({ type: "TOGGLE_GHOST" })}
            >
              <IconGhost />
            </button>
            <button className="tool" aria-pressed={state.exploded} aria-label="Exploded View (E)" title="Exploded View (E)" onClick={() => dispatch({ type: "TOGGLE_EXPLODE" })}>
              <IconExplode />
            </button>
          </div>

          <AnimatePresence>
            {state.exploded ? (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="absolute right-16 top-3 w-56 rounded-2xl border-[1.5px] border-ink bg-card p-3 shadow-[3px_3px_0_#252522] sm:right-20 sm:top-5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="label">Exploded view</span>
                  <span className="label text-dust">{Math.round(state.explodeAmount * 100)}%</span>
                </div>
                <input
                  type="range"
                  className="slider w-full"
                  min={0}
                  max={100}
                  value={Math.round(state.explodeAmount * 100)}
                  style={{ ["--fill" as string]: `${state.explodeAmount * 100}%` }}
                  onChange={(e) => dispatch({ type: "SET_EXPLODE", amount: Number(e.target.value) / 100 })}
                  aria-label="Explosion distance"
                />
                <p className="mt-1 text-[0.7rem] leading-snug text-dust">This step’s pieces lift along their assembly direction. Dashed guides show where each one lands.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {state.ghostPref && !state.exploded && state.step < total - 1 ? (
            <div className="label pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-sage-deep/50 bg-sage/30 px-3 py-1 !text-[0.58rem]">
              Ghost: step {state.step + 2} preview
            </div>
          ) : null}

          {/* Bottom corner — estimate */}
          <div className="absolute bottom-24 left-3 flex flex-col gap-1 rounded-xl border border-rule bg-card/90 px-3 py-2 backdrop-blur-sm sm:bottom-24 sm:left-5" title={est.basis}>
            <span className="label flex items-center gap-1.5 !text-[0.56rem] text-dust">
              <IconClock size={12} /> remaining · predicted
            </span>
            <span className="font-serif text-lg leading-none">{finished ? "All done" : formatRange(est)}</span>
            <span className="label !text-[0.56rem] text-dust">{pct}% complete</span>
          </div>

          <AnimatePresence>
            {finished && !state.exploded ? (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16 }}
                className="absolute bottom-24 right-3 max-w-xs rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[4px_4px_0_#252522] sm:right-5"
              >
                <span className="label text-terracotta">Finished</span>
                <p className="mt-1 font-serif text-xl">Lovely work. Your {set.name} is complete.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/studio/${set.id}`} className="btn btn-primary !px-3 !py-1.5 text-sm">Remix it</Link>
                  <button
                    className="btn btn-secondary !px-3 !py-1.5 text-sm"
                    onClick={() => {
                      clearProgress(set.id);
                      dispatch({ type: "GOTO", step: 0 });
                      dispatch({ type: "REPLAY" });
                    }}
                  >
                    Build again
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <PlaybackBar state={state} dispatch={dispatch} total={total} />
        </section>
      </div>
    </div>
  );
}

function PlaybackBar({ state, dispatch, total }: { state: GuidedState; dispatch: React.Dispatch<Parameters<typeof guidedReducer>[1]>; total: number }) {
  const [scrub, setScrub] = useState<number | null>(null);
  const shown = scrub ?? state.step;
  return (
    <div className="absolute inset-x-2 bottom-3 flex justify-center sm:inset-x-5">
      <div className="flex w-full max-w-3xl items-center gap-2 rounded-2xl border-[1.5px] border-ink bg-card px-2.5 py-2 shadow-[4px_4px_0_#252522] sm:gap-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <button className="tool !h-9 !w-9" aria-label="Previous step (←)" title="Previous step (←)" onClick={() => dispatch({ type: "PREV" })} disabled={state.step === 0}>
            <IconPrev size={16} />
          </button>
          <button className="tool !h-9 !w-9" aria-label="Replay this step (R)" title="Replay this step (R)" onClick={() => dispatch({ type: "REPLAY" })}>
            <IconReplay size={16} />
          </button>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-ink bg-terracotta text-card shadow-[2px_2px_0_#252522] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            aria-label={state.playing ? "Pause auto-play (Space)" : "Auto-play steps (Space)"}
            title={state.playing ? "Pause (Space)" : "Auto-play (Space)"}
            onClick={() => dispatch({ type: "TOGGLE_PLAY" })}
            disabled={state.exploded}
          >
            {state.playing ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>
          <button className="tool !h-9 !w-9" aria-label="Next step (→)" title="Next step (→)" onClick={() => dispatch({ type: "NEXT" })} disabled={state.step >= total - 1}>
            <IconNext size={16} />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between">
            <span className="label !text-[0.56rem] text-dust">
              Step <span className="text-ink">{pad(shown + 1)}</span> / {pad(total)}
            </span>
          </div>
          <input
            type="range"
            className="slider w-full"
            min={0}
            max={total - 1}
            value={shown}
            style={{ ["--fill" as string]: `${(shown / Math.max(1, total - 1)) * 100}%` }}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={() => {
              if (scrub !== null) dispatch({ type: "GOTO", step: scrub });
              setScrub(null);
            }}
            onKeyUp={() => {
              if (scrub !== null) dispatch({ type: "GOTO", step: scrub });
              setScrub(null);
            }}
            aria-label="Step progress"
          />
        </div>
        <label className="hidden items-center gap-1.5 sm:flex">
          <span className="label !text-[0.56rem] text-dust">Speed</span>
          <select
            value={state.speed}
            onChange={(e) => dispatch({ type: "SET_SPEED", speed: Number(e.target.value) as Speed })}
            className="rounded-lg border border-ink/30 bg-paper px-1.5 py-1 font-mono text-xs"
            aria-label="Animation speed"
          >
            {[0.5, 1, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
