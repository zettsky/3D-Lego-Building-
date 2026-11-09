import Link from "next/link";
import { CATALOG } from "@/data/catalog";
import { SearchBox } from "@/components/SearchBox";
import { SetCard } from "@/components/SetCard";
import { HeroCanvas } from "@/components/HeroCanvas";
import { SectionTitle, Strip } from "@/components/ui";
import { IconBrick, IconExplode, IconGhost, Sparkle } from "@/components/icons";

const curated = ["tsumiki-cottage", "tsumiki-sprout", "lego-10281", "lego-21058"].map((id) => CATALOG.find((s) => s.id === id)!);

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 lg:pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div className="relative z-10 flex flex-col items-start gap-6">
            <span className="label inline-flex items-center gap-2 text-terracotta">
              <Sparkle size={10} /> Instruction booklet, come to life
            </span>
            <h1 className="font-serif text-[2.7rem] leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.3rem]">
              A little brick.
              <br />
              <em className="font-normal italic text-terracotta">A world</em> of possibilities.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-ink-soft/85">
              Build at your own pace. Follow every piece in motion, or create something entirely your own.
            </p>
            <div className="w-full max-w-xl pt-2">
              <SearchBox large />
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-4 -z-0 rounded-[2rem] border-[1.5px] border-dashed border-dust/40" aria-hidden="true" />
            <div className="relative aspect-square w-full">
              <HeroCanvas />
            </div>
            <div className="label absolute bottom-6 left-6 flex items-center gap-2 text-dust">
              <span className="inline-block h-2 w-2 rounded-full bg-sage" /> fig. 01 — six bricks, one idea
            </div>
            <Sparkle size={18} className="absolute right-10 top-10 text-terracotta/70 float-y" />
            <Sparkle size={11} className="absolute right-20 top-20 text-sage-deep/70" />
          </div>
        </div>
      </section>

      {/* Two modes */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <Strip className="mb-10">Two ways to build</Strip>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              n: "A",
              title: "Guided Build",
              body: "Each step animates in front of you: new bricks float over and click into place. Spin the model, replay a step, peek at the next one with Ghost Mode, or pull the step apart with Exploded View.",
              icon: <IconGhost size={22} />,
              tone: "bg-sage/25",
              href: "/sets/tsumiki-cottage",
              cta: "Try the cottage",
            },
            {
              n: "B",
              title: "Custom Build",
              body: "Open a studio stocked with exactly the bricks from one set — no more, no less. Click or drag a piece and it snaps to the studs. Invent something new, save it, and come back later.",
              icon: <IconBrick size={22} />,
              tone: "bg-terracotta/10",
              href: "/studio/tsumiki-cottage",
              cta: "Open the studio",
            },
          ].map((m) => (
            <article key={m.n} className={`margin-rule relative flex flex-col gap-4 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card p-7 pl-16 shadow-[var(--shadow-soft)]`}>
              <span className="absolute left-4 top-6 font-serif text-2xl text-margin">{m.n}</span>
              <div className={`grid h-11 w-11 place-items-center rounded-xl border border-ink/70 ${m.tone}`}>{m.icon}</div>
              <h3 className="font-serif text-3xl tracking-tight">{m.title}</h3>
              <p className="leading-relaxed text-ink-soft/85">{m.body}</p>
              <Link href={m.href} className="btn btn-secondary mt-auto self-start text-sm">
                {m.cta} →
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-dust">Both modes run on the same 3D brick engine — same geometry, same studs, same rules.</p>
      </section>

      {/* Curated sets */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle kicker="On the workbench" title="Sets to begin with">
            Sets marked <em>interactive</em> have verified 3D instructions. Others show catalog details until their instructions are processed.
          </SectionTitle>
          <Link href="/explore" className="btn btn-secondary mb-8 text-sm">
            All sets →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {curated.map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-14 sm:px-8">
        <SectionTitle kicker="How it works" title="From booklet to bricks in motion" />
        <ol className="grid gap-px overflow-hidden rounded-2xl border-[1.5px] border-ink bg-ink md:grid-cols-4">
          {[
            ["01", "Find a set", "Search by name, number, theme or keyword."],
            ["02", "Pick a mode", "Follow the steps, or start a free build with that set's bricks."],
            ["03", "Build in 3D", "Rotate, zoom, replay. Ghost Mode previews; Exploded View explains."],
            ["04", "Pick up later", "Progress saves itself. Resume any time from My Builds."],
          ].map(([n, t, b]) => (
            <li key={n} className="flex flex-col gap-3 bg-card p-6">
              <span className="font-serif text-5xl font-light text-terracotta">{n}</span>
              <span className="font-serif text-xl">{t}</span>
              <span className="text-sm leading-relaxed text-ink-soft/80">{b}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-dust">
          <IconExplode size={16} /> Have an LDraw model?{" "}
          <Link href="/upload" className="text-ink underline decoration-terracotta decoration-2 underline-offset-4">
            Upload it
          </Link>{" "}
          and it becomes an interactive build.
        </div>
      </section>
    </>
  );
}
