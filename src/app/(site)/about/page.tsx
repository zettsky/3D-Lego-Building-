import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle, Strip, Tag } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

const STATUS: { area: string; state: "Working" | "Demo" | "Planned"; note: string }[] = [
  { area: "Shared 3D brick engine", state: "Working", note: "Grid coordinates, procedural real-dimension geometry, occupancy collisions, stud connections, validation." },
  { area: "Guided Build", state: "Working", note: "Step animations, replay/rewind, auto-play, speed, camera focus, progress autosave." },
  { area: "Ghost Mode & Exploded View", state: "Working", note: "Next-step ghosts with hover highlight; layer-aware explode with distance slider and guides." },
  { area: "Custom Build", state: "Working", note: "Exact-inventory studio, click & drag placement, snapping, rotate/move/duplicate/delete, undo/redo, save, export .ldr." },
  { area: "LDraw import", state: "Working", note: "Deterministic structured import for parts in the library; unknowns flagged, never guessed." },
  { area: "Set catalog", state: "Demo", note: "Two original Tsumiki models, plus LEGO 21368 Snoopy's Doghouse (the doghouse part) transcribed from its manual. Other real sets carry factual metadata only." },
  { area: "Sub-assemblies & sideways building", state: "Working", note: "Parts built on their own grid, staged beside the model, then attached at any angle (lawn panels, roof, name sign)." },
  { area: "Time estimates", state: "Demo", note: "Labelled predictions from piece types and pace. No measured builder data exists yet." },
  { area: "PDF / photo conversion", state: "Planned", note: "Vision proposes → geometry verifies → human reviews (Phase 6)." },
  { area: "Accounts, cloud sync, sharing", state: "Planned", note: "Phase 8. Today everything lives in your browser." },
  { area: "Technic, hinges, ball joints", state: "Planned", note: "Sideways studs and brackets work; moving joints (needed for Snoopy and Woodstock) come next." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8">
      <SectionTitle kicker="About" title="A cozy workshop, honestly built">
        Tsumiki turns building instructions into something you can turn over in your hands — and gives you a quiet studio to invent with the
        bricks you already have.
      </SectionTitle>

      <Strip className="mb-6">What works today</Strip>
      <ul className="mb-14 divide-y divide-dashed divide-rule overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card">
        {STATUS.map((s) => (
          <li key={s.area} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-56 shrink-0 font-serif text-lg">{s.area}</span>
            <Tag tone={s.state === "Working" ? "sage" : s.state === "Demo" ? "terracotta" : "plain"}>{s.state}</Tag>
            <span className="text-sm text-ink-soft">{s.note}</span>
          </li>
        ))}
      </ul>

      <Strip className="mb-6">Data & licensing</Strip>
      <div className="prose-sm mb-14 space-y-4 leading-relaxed text-ink-soft">
        <p>
          Brick geometry is generated from published LEGO-compatible dimensions (8 mm stud pitch, 9.6 mm bricks, 3.2 mm plates). No third-party
          meshes are bundled yet; a later phase adds the <a className="underline decoration-terracotta underline-offset-4" href="https://www.ldraw.org" rel="noreferrer" target="_blank">LDraw parts library</a> (CC BY 2.0, with attribution).
        </p>
        <p>
          Official LEGO instruction manuals and set images are copyrighted. Tsumiki does not redistribute them. Catalog entries for official
          sets contain only factual information, and anything you upload stays in your browser. The Snoopy's Doghouse model is our own
          3D transcription of the building steps; the manual itself is not included.
        </p>
        <p>
          Tsumiki is an independent fan project and is not affiliated with, endorsed or sponsored by the LEGO Group. LEGO® is a trademark of
          the LEGO Group.
        </p>
      </div>

      <Link href="/explore" className="btn btn-primary">Find a set to begin</Link>
    </div>
  );
}
