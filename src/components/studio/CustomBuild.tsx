"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SetEntry } from "@/data/catalog";
import { resolveSet } from "@/lib/sets";
import { downloadDataUrl, downloadText, getProject, saveProject, type CustomProject } from "@/lib/storage";
import { buildConnectionGraph, newUid, type BrickInstance } from "@/engine/assembly";
import { instructionInventory } from "@/engine/instructions";
import { invKey, remainingCounts, totalPieces, type InventoryLine } from "@/engine/inventory";
import { snapCandidate } from "@/engine/snapping";
import { initStudio, studioReducer, visibleBricks, type StudioAction } from "@/engine/studio";
import { exportLDraw } from "@/engine/ldraw";
import { CATEGORY_LABEL, getPart, type PartCategory } from "@/engine/parts";
import { COLORS, getColor } from "@/engine/colors";
import type { WorkspaceHandle } from "@/engine/render/Workspace";
import { PartThumb } from "@/components/Thumb";
import type { ProbeFn } from "./StudioScene";
import {
  IconBack, IconCamera, IconCheck, IconClose, IconCopy, IconDownload, IconGrid, IconMove, IconPanel, IconRedo, IconResetView, IconRotate, IconSearch, IconTrash, IconUndo,
} from "@/components/icons";

const StudioScene = dynamic(() => import("./StudioScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <span className="label animate-pulse text-dust">Setting out the build plate…</span>
    </div>
  ),
});

const PLATE_SIZE = 20;
const BOUNDS = { minX: 0, minZ: 0, maxX: PLATE_SIZE, maxZ: PLATE_SIZE };

export function CustomBuild({ id }: { id: string }) {
  const [set, setSet] = useState<SetEntry | null | undefined>(undefined);
  useEffect(() => setSet(resolveSet(id) ?? null), [id]);
  if (set === undefined) return <div className="h-dvh" />;
  if (!set || !set.instruction)
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-3xl">This set’s brick inventory hasn’t been processed yet.</h1>
        <p className="text-ink-soft/80">Custom Build needs the exact part list, so it is only available for sets with verified data.</p>
        <Link href={set ? `/sets/${set.id}` : "/explore"} className="btn btn-primary">Back</Link>
      </div>
    );
  return <Studio set={set} inventory={instructionInventory(set.instruction)} />;
}

function Studio({ set, inventory }: { set: SetEntry; inventory: InventoryLine[] }) {
  const params = useSearchParams();
  const [state, dispatch] = useReducer(studioReducer, undefined, () => initStudio(inventory, BOUNDS));
  const [project, setProject] = useState<CustomProject | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hover, setHover] = useState<{ anchor: { x: number; z: number } | null; uid: string | null }>({ anchor: null, uid: null });
  const [showGrid, setShowGrid] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const probe = useRef<ProbeFn | null>(null);
  const ws = useRef<WorkspaceHandle>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  const bricks = state.history.present;
  const shown = visibleBricks(state);
  const remaining = useMemo(() => remainingCounts(inventory, bricks), [inventory, bricks]);

  // Load or create the project.
  useEffect(() => {
    const pid = params.get("project");
    const existing = pid ? getProject(pid) : null;
    if (existing && existing.setId === set.id) {
      dispatch({ type: "LOAD", bricks: existing.bricks });
      setProject(existing);
    } else {
      const now = Date.now();
      setProject({ id: newUid("p"), name: `My ${set.name} remix`, setId: set.id, bricks: [], createdAt: now, updatedAt: now });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  // Autosave (debounced) once something has been built.
  useEffect(() => {
    if (!project) return;
    if (!bricks.length && !getProject(project.id)) return;
    const t = window.setTimeout(() => {
      const p = { ...project, bricks, updatedAt: Date.now() };
      saveProject(p);
      setSavedAt(p.updatedAt);
      const url = new URL(window.location.href);
      if (url.searchParams.get("project") !== p.id) {
        url.searchParams.set("project", p.id);
        window.history.replaceState(null, "", url.toString());
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [bricks, project]);

  const candidate = useMemo(() => {
    if (!state.active || !hover.anchor) return null;
    return snapCandidate(bricks, state.active.partId, state.active.colorId, state.active.rot, hover.anchor, BOUNDS, {
      uid: "ghost",
      ignoreUid: state.moving?.uid,
    });
  }, [bricks, state.active, state.moving, hover.anchor]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const mod = e.ctrlKey || e.metaKey;
      let a: StudioAction | null = null;
      if (mod && e.key.toLowerCase() === "z") a = { type: e.shiftKey ? "REDO" : "UNDO" };
      else if (mod && e.key.toLowerCase() === "y") a = { type: "REDO" };
      else if (mod) return;
      else if (e.key === "r" || e.key === "R") a = { type: "ROTATE" };
      else if (e.key === "Delete" || e.key === "Backspace") a = { type: "DELETE" };
      else if (e.key === "Escape") a = { type: "CANCEL" };
      else if (e.key === "d") a = { type: "DUPLICATE" };
      else if (e.key === "m") a = { type: "MOVE" };
      else if (e.key === "g") {
        setShowGrid((g) => !g);
        e.preventDefault();
        return;
      }
      if (a) {
        e.preventDefault();
        dispatch(a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-dismiss messages.
  useEffect(() => {
    if (!state.message) return;
    const t = window.setTimeout(() => dispatch({ type: "DISMISS_MESSAGE" }), 3200);
    return () => window.clearTimeout(t);
  }, [state.message]);

  const updateHover = (x: number, y: number) => {
    const h = probe.current?.(x, y) ?? { anchor: null, uid: null };
    setHover((prev) =>
      prev.uid === h.uid && prev.anchor?.x === h.anchor?.x && prev.anchor?.z === h.anchor?.z ? prev : h,
    );
    return h;
  };

  const selectedBrick = bricks.find((b) => b.uid === state.selected) ?? null;
  const used = totalPieces(inventory) - [...remaining.values()].reduce((s, n) => s + Math.max(0, n), 0);

  return (
    <div className="paper-plain fixed inset-0 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="z-20 flex items-center gap-2 border-b border-rule bg-paper/85 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-5">
        <Link href={`/sets/${set.id}`} className="tool" aria-label="Back to set">
          <IconBack />
        </Link>
        <button className="tool lg:hidden" aria-label="Show brick inventory" aria-expanded={leftOpen} onClick={() => setLeftOpen((o) => !o)}>
          <IconPanel />
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="label !text-[0.58rem] text-dust">Custom build · bricks from {set.name}</span>
          <input
            value={project?.name ?? ""}
            onChange={(e) => project && setProject({ ...project, name: e.target.value })}
            onBlur={() => project && getProject(project.id) && saveProject({ ...project, bricks, updatedAt: Date.now() })}
            className="w-[52vw] max-w-72 truncate rounded bg-transparent font-serif text-lg leading-tight outline-none hover:bg-cream/50 focus:bg-card"
            aria-label="Project name"
          />
        </div>
        <span className="label ml-1 hidden items-center gap-1 text-dust md:flex" aria-live="polite">
          {savedAt ? (
            <>
              <IconCheck size={12} /> saved
            </>
          ) : (
            "not saved yet"
          )}
        </span>
        <div className="ml-auto flex items-center gap-1.5" role="toolbar" aria-label="Edit tools">
          <button className="tool" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled={!state.history.past.length} onClick={() => dispatch({ type: "UNDO" })}>
            <IconUndo />
          </button>
          <button className="tool" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled={!state.history.future.length} onClick={() => dispatch({ type: "REDO" })}>
            <IconRedo />
          </button>
          <span className="mx-1 hidden h-6 w-px bg-rule sm:block" />
          <button className="tool hidden sm:grid" aria-label="Toggle grid (G)" title="Toggle grid (G)" aria-pressed={showGrid} onClick={() => setShowGrid((g) => !g)}>
            <IconGrid />
          </button>
          <button className="tool hidden sm:grid" aria-label="Reset camera" title="Reset camera" onClick={() => ws.current?.reset()}>
            <IconResetView />
          </button>
          <button
            className="tool hidden sm:grid"
            aria-label="Save screenshot"
            title="Save screenshot (PNG)"
            onClick={() => {
              const url = ws.current?.screenshot();
              if (url) downloadDataUrl(`${(project?.name ?? "tsumiki").replace(/\W+/g, "-")}.png`, url);
            }}
          >
            <IconCamera />
          </button>
          <ExportMenu
            disabled={!bricks.length}
            onLdraw={() => downloadText(`${(project?.name ?? "model").replace(/\W+/g, "-")}.ldr`, exportLDraw(project?.name ?? "Tsumiki model", [bricks]))}
            onJson={() => downloadText(`${(project?.name ?? "model").replace(/\W+/g, "-")}.json`, JSON.stringify({ format: "tsumiki/v1", setId: set.id, bricks }, null, 2), "application/json")}
          />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <InventoryPanel
          inventory={inventory}
          remaining={remaining}
          active={state.active && !state.moving ? invKey(state.active.partId, state.active.colorId) : null}
          onPick={(partId, colorId) => {
            dispatch({ type: "PICK_PART", partId, colorId });
            setLeftOpen(false);
          }}
          used={used}
          total={totalPieces(inventory)}
          open={leftOpen}
          onClose={() => setLeftOpen(false)}
        />

        {/* Center canvas */}
        <section
          className={`relative min-w-0 flex-1 touch-none ${state.active ? "cursor-crosshair" : hover.uid ? "cursor-pointer" : ""}`}
          aria-label="3D build plate. Pick a brick, then click to place it. Drag to orbit, scroll to zoom, right-drag to pan."
          onPointerMove={(e) => updateHover(e.clientX, e.clientY)}
          onPointerLeave={() => setHover({ anchor: null, uid: null })}
          onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const d = down.current;
            down.current = null;
            if (!d || e.button !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
            if ((e.target as HTMLElement).closest("button, input, [data-ui]")) return;
            const h = updateHover(e.clientX, e.clientY);
            if (state.active) {
              if (h.anchor) dispatch({ type: "PLACE", anchor: h.anchor });
            } else dispatch({ type: "SELECT", uid: h.uid });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            updateHover(e.clientX, e.clientY);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const [partId, colorId] = e.dataTransfer.getData("text/tsumiki-part").split("|");
            const h = updateHover(e.clientX, e.clientY);
            if (partId && colorId && h.anchor) dispatch({ type: "DROP", partId, colorId, anchor: h.anchor });
          }}
        >
          <StudioScene
            bricks={shown}
            candidate={candidate}
            selected={state.selected}
            hovered={state.active ? null : hover.uid}
            plateSize={PLATE_SIZE}
            showGrid={showGrid}
            probeRef={probe}
            wsRef={ws}
          />

          {!bricks.length && !state.active ? (
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-2xl border border-dashed border-dust/60 bg-card/85 px-4 py-2 text-center text-sm text-ink-soft">
              Pick a brick from the inventory, then click the plate to place it — or drag it straight on.
            </div>
          ) : null}

          {/* Active part chip */}
          {state.active ? (
            <div data-ui className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border-[1.5px] border-ink bg-card py-1 pl-1 pr-2 shadow-[3px_3px_0_#252522]">
              <PartThumb partId={state.active.partId} colorId={state.active.colorId} size={28} className="h-7 w-7" />
              <span className="text-sm">
                {state.moving ? "Moving " : ""}
                {getPart(state.active.partId).name}
              </span>
              <span className={`label !text-[0.55rem] ${candidate?.valid === false ? "text-terracotta" : "text-sage-deep"}`}>
                {candidate ? (candidate.valid ? "fits" : "blocked") : "hover the plate"}
              </span>
              <button className="tool !h-7 !w-7 !rounded-full" aria-label="Rotate (R)" title="Rotate (R)" onClick={() => dispatch({ type: "ROTATE" })}>
                <IconRotate size={14} />
              </button>
              <button className="tool !h-7 !w-7 !rounded-full" aria-label="Cancel (Esc)" title="Cancel (Esc)" onClick={() => dispatch({ type: "CANCEL" })}>
                <IconClose size={14} />
              </button>
            </div>
          ) : null}

          <AnimatePresence>
            {state.message ? (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-card shadow-lg"
              >
                {state.message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="label pointer-events-none absolute bottom-5 left-4 hidden !text-[0.56rem] text-dust xl:block">
            R rotate · M move · D duplicate · Del delete · Esc cancel · Ctrl+Z undo
          </div>
        </section>

        {/* Right panel — contextual tools */}
        <ContextPanel
          brick={selectedBrick}
          bricks={bricks}
          remaining={remaining}
          open={rightOpen}
          onToggle={() => setRightOpen((o) => !o)}
          dispatch={dispatch}
          onClear={() => dispatch({ type: "CLEAR" })}
        />
      </div>
    </div>
  );
}

function ExportMenu({ disabled, onLdraw, onJson }: { disabled: boolean; onLdraw: () => void; onJson: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="tool" aria-label="Export model" title="Export model" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <IconDownload />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border-[1.5px] border-ink bg-card p-1.5 shadow-[3px_3px_0_#252522]" onMouseLeave={() => setOpen(false)}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { onLdraw(); setOpen(false); }}>
            LDraw model (.ldr)
            <span className="block text-xs text-dust">Opens in LDraw tools and Studio</span>
          </button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { onJson(); setOpen(false); }}>
            Tsumiki JSON
            <span className="block text-xs text-dust">Exact engine data</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

const CATEGORY_ORDER: PartCategory[] = ["brick", "plate", "tile", "slope", "panel", "arch", "round", "snot", "special"];

function InventoryPanel({
  inventory, remaining, active, onPick, used, total, open, onClose,
}: {
  inventory: InventoryLine[];
  remaining: Map<string, number>;
  active: string | null;
  onPick: (partId: string, colorId: string) => void;
  used: number;
  total: number;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"type" | "color">("type");
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);

  const lines = useMemo(() => {
    const t = q.trim().toLowerCase();
    return inventory
      .filter((l) => {
        if (hideEmpty && (remaining.get(invKey(l.partId, l.colorId)) ?? 0) <= 0) return false;
        if (!t) return true;
        const p = getPart(l.partId);
        return `${p.name} ${p.id} ${getColor(l.colorId).name} ${CATEGORY_LABEL[p.category]}`.toLowerCase().includes(t);
      })
      .sort((a, b) => getPart(a.partId).h - getPart(b.partId).h || getPart(b.partId).w * getPart(b.partId).d - getPart(a.partId).w * getPart(a.partId).d);
  }, [inventory, remaining, q, hideEmpty]);

  const groups = useMemo(() => {
    if (tab === "type")
      return CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABEL[c], swatch: null as string | null, items: lines.filter((l) => getPart(l.partId).category === c) })).filter((g) => g.items.length);
    return COLORS.map((c) => ({ key: c.id, label: c.name, swatch: c.hex as string | null, items: lines.filter((l) => l.colorId === c.id) })).filter((g) => g.items.length);
  }, [lines, tab]);

  return (
    <aside
      aria-label="Brick inventory"
      className={`absolute inset-y-0 left-0 z-20 flex w-[300px] max-w-[88vw] flex-col border-r border-rule bg-paper/95 backdrop-blur-sm transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex flex-col gap-3 border-b border-dashed border-rule p-4">
        <div className="flex items-center justify-between">
          <span className="label">Brick inventory</span>
          <span className="label text-dust">{total - used} / {total} left</span>
          <button className="tool !h-8 !w-8 lg:hidden" aria-label="Close inventory" onClick={onClose}>
            <IconClose size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-ink/40 bg-card px-3 py-1.5">
          <IconSearch size={14} className="text-dust" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bricks…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search bricks" />
        </div>
        <div className="flex rounded-full border border-ink bg-card p-0.5" role="tablist" aria-label="Group bricks">
          {(["type", "color"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-1.5 text-sm transition-colors ${tab === t ? "bg-ink text-card" : "hover:bg-cream"}`}>
              By {t === "type" ? "Type" : "Color"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="accent-[#77875F]" />
          Hide pieces that are used up
        </label>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-3">
        {groups.map((g) => (
          <div key={g.key} className="mb-4">
            <div className="label mb-2 flex items-center gap-2 px-1 !text-[0.58rem] text-dust">
              {g.swatch ? <span className="h-2.5 w-2.5 rounded-full border border-ink/30" style={{ background: g.swatch }} /> : null}
              {g.label}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {g.items.map((l) => {
                const k = invKey(l.partId, l.colorId);
                const left = remaining.get(k) ?? 0;
                const empty = left <= 0;
                return (
                  <li key={k}>
                    <button
                      draggable={!empty}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/tsumiki-part", k);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onPick(l.partId, l.colorId)}
                      disabled={empty}
                      aria-pressed={active === k}
                      aria-label={`${getColor(l.colorId).name} ${getPart(l.partId).name}, ${left} remaining`}
                      className={`group relative flex w-full flex-col items-center rounded-xl border bg-card p-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${active === k ? "border-terracotta shadow-[2px_2px_0_#C96B55]" : "border-rule hover:border-ink/60"} ${empty ? "opacity-40" : ""}`}
                    >
                      <PartThumb partId={l.partId} colorId={l.colorId} size={56} className="h-14 w-14" />
                      <span className="text-[0.72rem] leading-tight">{getPart(l.partId).name}</span>
                      <span className="label truncate !text-[0.5rem] text-dust">{getColor(l.colorId).name}</span>
                      <span className={`label absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 !text-[0.55rem] ${empty ? "bg-cream text-dust" : "bg-ink text-card"}`}>
                        {left}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!groups.length ? <p className="p-4 text-center text-sm text-dust">No bricks match.</p> : null}
      </div>
    </aside>
  );
}

function ContextPanel({
  brick, bricks, remaining, open, onToggle, dispatch, onClear,
}: {
  brick: BrickInstance | null;
  bricks: BrickInstance[];
  remaining: Map<string, number>;
  open: boolean;
  onToggle: () => void;
  dispatch: React.Dispatch<StudioAction>;
  onClear: () => void;
}) {
  const connections = useMemo(() => {
    if (!brick) return { count: 0, grounded: false };
    const g = buildConnectionGraph(bricks);
    return { count: g.adj.get(brick.uid)?.size ?? 0, grounded: brick.y === 0 };
  }, [brick, bricks]);

  if (!open)
    return (
      <button data-ui className="tool absolute right-3 top-3 z-10" aria-label="Show brick details" onClick={onToggle}>
        <IconPanel />
      </button>
    );

  return (
    <aside data-ui aria-label="Selected brick" className="absolute right-3 top-3 z-10 w-60 rounded-2xl border-[1.5px] border-ink bg-card shadow-[4px_4px_0_#252522]">
      <div className="flex items-center justify-between border-b border-dashed border-rule px-3 py-2">
        <span className="label">{brick ? "Selected brick" : "Tools"}</span>
        <button className="rounded p-1 hover:bg-cream" aria-label="Collapse panel" onClick={onToggle}>
          <IconClose size={14} />
        </button>
      </div>
      {brick ? (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <PartThumb partId={brick.partId} colorId={brick.colorId} size={44} className="h-11 w-11" />
            <div className="min-w-0">
              <div className="font-serif text-lg leading-tight">{getPart(brick.partId).name}</div>
              <div className="label flex items-center gap-1.5 !text-[0.55rem] text-dust">
                <span className="h-2 w-2 rounded-full border border-ink/30" style={{ background: getColor(brick.colorId).hex }} />
                {getColor(brick.colorId).name} · #{getPart(brick.partId).id}
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-4 gap-1 text-center">
            {[["X", brick.x], ["Y", brick.y], ["Z", brick.z], ["Rot", `${brick.rot * 90}°`]].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg bg-paper py-1">
                <dt className="label !text-[0.5rem] text-dust">{k}</dt>
                <dd className="font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ink-soft">
            {connections.grounded ? "On the build plate. " : ""}
            Clutches {connections.count} {connections.count === 1 ? "brick" : "bricks"} · {Math.max(0, remaining.get(invKey(brick.partId, brick.colorId)) ?? 0)} more in inventory
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            <button className="tool !w-full" aria-label="Rotate (R)" title="Rotate (R)" onClick={() => dispatch({ type: "ROTATE" })}><IconRotate /></button>
            <button className="tool !w-full" aria-label="Move (M)" title="Move (M)" onClick={() => dispatch({ type: "MOVE" })}><IconMove /></button>
            <button className="tool !w-full" aria-label="Duplicate (D)" title="Duplicate (D)" onClick={() => dispatch({ type: "DUPLICATE" })}><IconCopy /></button>
            <button className="tool !w-full hover:!bg-terracotta hover:!text-card" aria-label="Delete (Del)" title="Delete (Del)" onClick={() => dispatch({ type: "DELETE" })}><IconTrash /></button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 text-sm text-ink-soft">
          <p>Click a placed brick to select it. Pick from the inventory to add more.</p>
          <p className="text-xs text-dust">Bricks snap onto studs. Tiles and slope faces are smooth — nothing can sit on them.</p>
          <button className="btn btn-secondary !py-1.5 text-sm" disabled={!bricks.length} onClick={() => window.confirm("Clear every brick from the plate? You can undo this.") && onClear()}>
            Clear plate
          </button>
        </div>
      )}
    </aside>
  );
}
