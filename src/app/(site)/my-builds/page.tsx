"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveSet } from "@/lib/sets";
import { clearProgress, deleteProject, listProgress, listProjects, saveProject, type CustomProject, type GuidedProgress } from "@/lib/storage";
import { newUid } from "@/engine/assembly";
import { Thumb } from "@/components/Thumb";
import { SectionTitle, Strip } from "@/components/ui";
import { IconCopy, IconTrash } from "@/components/icons";

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(t).toLocaleDateString();
}

export default function MyBuildsPage() {
  const [progress, setProgress] = useState<GuidedProgress[]>([]);
  const [projects, setProjects] = useState<CustomProject[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setProgress(listProgress());
      setProjects(listProjects());
      setReady(true);
    };
    load();
    window.addEventListener("tsumiki-storage", load);
    return () => window.removeEventListener("tsumiki-storage", load);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionTitle kicker="My builds" title="Pick up where you left off">
        Progress and creations are saved in this browser. Accounts and cloud sync arrive in a later phase.
      </SectionTitle>

      <Strip className="mb-6">Guided builds in progress</Strip>
      {ready && !progress.length ? (
        <Empty text="No guided builds yet." href="/explore" cta="Find a set" />
      ) : (
        <ul className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progress.map((p) => {
            const set = resolveSet(p.setId);
            if (!set) return null;
            const pct = Math.round(((p.step + 1) / p.total) * 100);
            return (
              <li key={p.setId} className="flex items-center gap-4 rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="label !text-[0.58rem] text-dust">No. {set.setNumber} · {ago(p.updatedAt)}</span>
                  <span className="truncate font-serif text-xl">{set.name}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream">
                    <div className="h-full bg-terracotta" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="label !text-[0.58rem]">Step {p.step + 1} of {p.total} · {pct}%</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/build/${p.setId}`} className="btn btn-primary !px-3 !py-1.5 text-sm">Resume</Link>
                  <button className="text-xs text-dust underline-offset-2 hover:underline" onClick={() => clearProgress(p.setId)}>Reset</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Strip className="mb-6">Custom creations</Strip>
      {ready && !projects.length ? (
        <Empty text="No creations yet." href="/studio/tsumiki-cottage" cta="Open the studio" />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p) => {
            const set = resolveSet(p.setId);
            return (
              <li key={p.id} className="lift flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card">
                <Link href={`/studio/${p.setId}?project=${p.id}`} className="paper aspect-square border-b border-dashed border-rule p-4">
                  {p.bricks.length ? (
                    <Thumb id={`proj:${p.id}:${p.updatedAt}`} bricks={p.bricks} size={240} alt={`Render of ${p.name}`} className="h-full w-full" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-dust">Empty plate</div>
                  )}
                </Link>
                <div className="flex flex-col gap-2 p-3">
                  <input
                    defaultValue={p.name}
                    onBlur={(e) => e.target.value !== p.name && saveProject({ ...p, name: e.target.value || p.name, updatedAt: Date.now() })}
                    className="rounded bg-transparent font-serif text-lg outline-none hover:bg-cream/60 focus:bg-paper"
                    aria-label="Rename creation"
                  />
                  <span className="label !text-[0.56rem] text-dust">
                    {p.bricks.length} bricks · from {set?.name ?? p.setId} · {ago(p.updatedAt)}
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/studio/${p.setId}?project=${p.id}`} className="btn btn-secondary flex-1 !py-1 text-sm">Open</Link>
                    <button
                      className="tool !h-8 !w-8"
                      aria-label={`Duplicate ${p.name}`}
                      title="Duplicate"
                      onClick={() => saveProject({ ...p, id: newUid("p"), name: `${p.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() })}
                    >
                      <IconCopy size={14} />
                    </button>
                    <button
                      className="tool !h-8 !w-8"
                      aria-label={`Delete ${p.name}`}
                      title="Delete"
                      onClick={() => window.confirm(`Delete “${p.name}”? This can’t be undone.`) && deleteProject(p.id)}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="dashed-ticket mb-14 flex flex-col items-center gap-3 rounded-2xl bg-card/60 p-8 text-center">
      <span className="font-serif text-xl">{text}</span>
      <Link href={href} className="btn btn-secondary text-sm">{cta}</Link>
    </div>
  );
}
