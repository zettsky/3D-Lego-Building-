"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SetEntry } from "@/data/catalog";
import { allSets } from "@/lib/sets";
import { makeFuse, SearchBox, searchSets } from "@/components/SearchBox";
import { SetCard } from "@/components/SetCard";
import { Strip } from "@/components/ui";

export function ExploreClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [theme, setTheme] = useState<string>("all");
  const [onlyInteractive, setOnlyInteractive] = useState(false);
  const [sets, setSets] = useState<SetEntry[]>([]);

  useEffect(() => setSets(allSets()), []);
  useEffect(() => setQ(initial), [initial]);
  const fuse = useMemo(() => makeFuse(sets), [sets]);
  const themes = useMemo(() => [...new Set(sets.map((s) => s.theme))], [sets]);
  const results = useMemo(
    () =>
      searchSets(fuse, sets, q)
        .filter((s) => theme === "all" || s.theme === theme)
        .filter((s) => !onlyInteractive || s.status === "interactive"),
    [fuse, sets, q, theme, onlyInteractive],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Explore sets</h1>
        <div className="w-full max-w-2xl">
          <SearchBox
            key={initial}
            initial={initial}
            onQuery={(v) => {
              setQ(v);
              router.replace(v ? `/explore?q=${encodeURIComponent(v)}` : "/explore", { scroll: false });
            }}
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by theme">
        {["all", ...themes].map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${theme === t ? "border-ink bg-ink text-card" : "border-ink/25 bg-card hover:border-ink"}`}
          >
            {t === "all" ? "All themes" : t}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={onlyInteractive} onChange={(e) => setOnlyInteractive(e.target.checked)} className="h-4 w-4 accent-[#77875F]" />
          Interactive instructions only
        </label>
      </div>

      <Strip className="mb-8">
        {results.length} {results.length === 1 ? "set" : "sets"}
        {q ? ` for “${q}”` : ""}
      </Strip>

      {results.length ? (
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {results.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              >
                <SetCard set={s} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="dashed-ticket mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl bg-card/70 p-10 text-center">
          <span className="font-serif text-2xl">Nothing on this shelf yet.</span>
          <p className="text-ink-soft/80">
            We couldn’t find “{q}”. Our catalog is still small — if you have the model as an LDraw file you can import it yourself.
          </p>
          <Link href="/upload" className="btn btn-primary mt-2 text-sm">
            Upload instructions
          </Link>
        </div>
      )}
    </div>
  );
}
