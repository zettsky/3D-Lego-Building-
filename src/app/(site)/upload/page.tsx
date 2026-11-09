"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { importLDraw, type ImportIssue } from "@/engine/ldraw";
import { validateInstruction, type Instruction } from "@/engine/instructions";
import { newUid } from "@/engine/assembly";
import { deleteImport, listImports, saveImport } from "@/lib/storage";
import { SectionTitle, Strip, Tag } from "@/components/ui";
import { IconCheck, IconTrash, IconUpload } from "@/components/icons";

type Stage = "idle" | "reading" | "parsing" | "validating" | "done" | "review" | "failed" | "unsupported";

interface Job {
  file: string;
  stage: Stage;
  issues: ImportIssue[];
  geometry: string[];
  instruction: Instruction | null;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: "reading", label: "Reading file" },
  { key: "parsing", label: "Matching parts & colours" },
  { key: "validating", label: "Validating geometry" },
  { key: "done", label: "Ready to build" },
];

const tick = () => new Promise((r) => setTimeout(r, 350));

export default function UploadPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [imports, setImports] = useState<Instruction[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => setImports(listImports());
    load();
    window.addEventListener("tsumiki-storage", load);
    return () => window.removeEventListener("tsumiki-storage", load);
  }, []);

  async function handle(file: File) {
    const name = file.name;
    const ext = name.toLowerCase().split(".").pop() ?? "";
    if (["pdf", "png", "jpg", "jpeg", "webp"].includes(ext)) {
      setJob({ file: name, stage: "unsupported", issues: [], geometry: [], instruction: null });
      return;
    }
    if (!["ldr", "mpd", "dat", "txt"].includes(ext)) {
      setJob({ file: name, stage: "failed", issues: [{ line: 0, message: "Unrecognised file type. Use an LDraw .ldr or .mpd file." }], geometry: [], instruction: null });
      return;
    }
    setJob({ file: name, stage: "reading", issues: [], geometry: [], instruction: null });
    const text = await file.text();
    await tick();
    setJob((j) => j && { ...j, stage: "parsing" });
    const res = importLDraw(text, newUid("imp"), name.replace(/\.\w+$/, ""));
    await tick();
    if (!res.instruction) {
      setJob({ file: name, stage: "failed", issues: res.issues, geometry: [], instruction: null });
      return;
    }
    setJob((j) => j && { ...j, stage: "validating", issues: res.issues });
    const geo = validateInstruction(res.instruction).map((i) => `Step ${i.step + 1}: ${i.message}`);
    await tick();
    const needsReview = geo.length > 0 || res.issues.length > 0;
    setJob({ file: name, stage: needsReview ? "review" : "done", issues: res.issues, geometry: geo, instruction: res.instruction });
    if (!needsReview) saveImport(res.instruction);
  }

  const activeIdx = job ? STAGES.findIndex((s) => s.key === job.stage) : -1;

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8">
      <SectionTitle kicker="Upload" title="Bring your own instructions">
        Structured LDraw models convert deterministically today. PDF and photo manuals need the computer-vision pipeline, which isn’t
        live yet — we won’t pretend otherwise.
      </SectionTitle>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-[1.5px] border-sage-deep/60 bg-sage/20 p-4">
          <div className="mb-1 flex items-center gap-2"><Tag tone="sage">Available</Tag></div>
          <p className="font-serif text-lg">LDraw .ldr / .mpd</p>
          <p className="text-sm text-ink-soft">Parts in our validated library, quarter-turn rotations, grid-aligned. Each <code className="font-mono text-xs">0 STEP</code> becomes a step.</p>
        </div>
        <div className="rounded-xl border border-dashed border-dust/60 bg-card/60 p-4">
          <div className="mb-1 flex items-center gap-2"><Tag>Planned · Phase 6</Tag></div>
          <p className="font-serif text-lg">PDF & page photos</p>
          <p className="text-sm text-ink-soft">Step detection + part recognition proposes; geometry checks verify; uncertain steps go to human review.</p>
        </div>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        className={`margin-rule flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-card p-10 pl-16 text-center transition-colors ${drag ? "border-terracotta bg-terracotta/5" : "border-ink/40 hover:border-ink"}`}
      >
        <IconUpload size={28} className="text-terracotta" />
        <span className="font-serif text-2xl">Drop an instruction file here</span>
        <span className="text-sm text-dust">or click to choose · .ldr, .mpd (PDFs are recognised but not yet converted)</span>
        <input
          ref={input}
          type="file"
          accept=".ldr,.mpd,.dat,.txt,.pdf,image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </label>

      {job ? (
        <section className="mt-6 rounded-2xl border-[1.5px] border-ink bg-card p-5 shadow-[4px_4px_0_#252522]" aria-live="polite">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="truncate font-serif text-xl">{job.file}</span>
            {job.stage === "done" ? <Tag tone="sage">Validated</Tag> : job.stage === "review" ? <Tag tone="terracotta">Needs review</Tag> : job.stage === "failed" ? <Tag tone="terracotta">Couldn’t convert</Tag> : job.stage === "unsupported" ? <Tag>Not yet supported</Tag> : <Tag>Processing…</Tag>}
          </div>

          {job.stage === "unsupported" ? (
            <p className="text-ink-soft">
              PDF and image manuals can’t be converted yet: turning 2D drawings into exact 3D placements requires the vision + validation +
              review pipeline planned for Phase 6. Your file was <strong>not</strong> uploaded or stored. If you can export the model as LDraw
              (for example from BrickLink Studio), upload that instead.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {STAGES.map((s, i) => {
                const failedHere = (job.stage === "failed" || job.stage === "review") && i === (job.stage === "failed" ? 1 : 3);
                const done = activeIdx > i || (job.stage === "review" && i < 3) || (job.stage === "done" && i <= 3);
                const current = activeIdx === i && job.stage !== "done";
                return (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span className={`grid h-6 w-6 place-items-center rounded-full border ${failedHere ? "border-terracotta bg-terracotta text-card" : done ? "border-ink bg-ink text-card" : current ? "animate-pulse border-terracotta" : "border-rule"}`}>
                      {failedHere ? "!" : done ? <IconCheck size={12} /> : null}
                    </span>
                    <span className={done || current || failedHere ? "" : "text-dust"}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {job.issues.length || job.geometry.length ? (
            <div className="mt-4 rounded-xl bg-paper p-3">
              <span className="label mb-2 block text-terracotta">Flagged for review ({job.issues.length + job.geometry.length})</span>
              <ul className="scroll-thin max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-ink-soft">
                {job.issues.map((i, k) => (
                  <li key={`i${k}`}>{i.line ? `line ${i.line}: ` : ""}{i.message}</li>
                ))}
                {job.geometry.map((g, k) => (
                  <li key={`g${k}`}>{g}</li>
                ))}
              </ul>
              {job.stage === "review" && job.instruction ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-ink-soft">Lines we couldn’t read were skipped, not guessed. Keep the rest anyway?</span>
                  {validateInstruction(job.instruction).length === 0 ? (
                    <button
                      className="btn btn-secondary !py-1 text-sm"
                      onClick={() => {
                        saveImport(job.instruction!);
                        setJob({ ...job, stage: "done" });
                      }}
                    >
                      Keep valid parts
                    </button>
                  ) : (
                    <span className="text-terracotta">The remaining geometry doesn’t validate, so it can’t be built.</span>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {job.stage === "done" && job.instruction ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/build/import-${job.instruction.id}`} className="btn btn-primary text-sm">Start building</Link>
              <Link href={`/sets/import-${job.instruction.id}`} className="btn btn-secondary text-sm">View details</Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-12">
        <Strip className="mb-5">Your uploads</Strip>
        {imports.length ? (
          <ul className="flex flex-col gap-2">
            {imports.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-xl border border-rule bg-card px-4 py-3">
                <span className="min-w-0 flex-1 truncate font-serif text-lg">{i.title}</span>
                <span className="label hidden text-dust sm:inline">{i.steps.length} steps</span>
                <Link href={`/sets/import-${i.id}`} className="btn btn-secondary !px-3 !py-1 text-sm">Open</Link>
                <button className="tool !h-8 !w-8" aria-label={`Remove ${i.title}`} onClick={() => window.confirm(`Remove “${i.title}” from this browser?`) && deleteImport(i.id)}>
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-dust">
            Nothing yet. Want something to try? Export a model from the{" "}
            <Link href="/studio/tsumiki-cottage" className="underline decoration-terracotta underline-offset-4">studio</Link> as .ldr and upload it here.
          </p>
        )}
      </div>
    </div>
  );
}
