"use client";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SetEntry } from "@/data/catalog";
import { allSets } from "@/lib/sets";
import { IconSearch } from "./icons";

export function makeFuse(sets: SetEntry[]) {
  return new Fuse(sets, {
    keys: [
      { name: "name", weight: 3 },
      { name: "setNumber", weight: 3 },
      { name: "theme", weight: 1.5 },
      { name: "collection", weight: 1.5 },
      { name: "keywords", weight: 1 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    includeMatches: false,
  });
}

export function searchSets(fuse: Fuse<SetEntry>, sets: SetEntry[], q: string): SetEntry[] {
  const t = q.trim();
  if (!t) return sets;
  return fuse.search(t).map((r) => r.item);
}

const SUGGESTIONS = ["Botanical Collection", "Architecture", "Technic", "Star Wars", "cottage", "10281"];

export function SearchBox({ initial = "", large = false, onQuery }: { initial?: string; large?: boolean; onQuery?: (q: string) => void }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [sets, setSets] = useState<SetEntry[]>([]);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setSets(allSets()), []);
  const fuse = useMemo(() => makeFuse(sets), [sets]);
  const results = useMemo(() => (q.trim() ? searchSets(fuse, sets, q).slice(0, 6) : []), [fuse, sets, q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (value = q) => {
    setOpen(false);
    if (onQuery) onQuery(value);
    else router.push(`/explore?q=${encodeURIComponent(value)}`);
  };

  return (
    <div ref={wrap} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && results[active]) router.push(`/sets/${results[active].id}`);
          else submit();
        }}
        className={`flex items-center gap-3 rounded-full border-[1.5px] border-ink bg-card shadow-[var(--shadow-press)] transition-shadow focus-within:shadow-[4px_4px_0_#C96B55] ${large ? "px-5 py-3.5" : "px-4 py-2.5"}`}
      >
        <IconSearch size={large ? 20 : 17} className="shrink-0 text-dust" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
            onQuery?.(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Find a set to begin…"
          aria-label="Search sets by name, number, theme or keyword"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-dust/70 ${large ? "text-lg" : "text-base"}`}
        />
        <button type="submit" className="btn btn-primary !px-4 !py-1.5 text-sm !shadow-none hover:!shadow-none">
          Search
        </button>
      </form>
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-3 top-full z-40 mt-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card py-1.5 text-left shadow-[4px_4px_0_#252522]"
        >
          {results.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => router.push(`/sets/${s.id}`)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${i === active ? "bg-cream/70" : ""}`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-serif text-[1.02rem]">{s.name}</span>
                  <span className="label !text-[0.58rem] text-dust">
                    {s.setNumber} · {s.theme} · {s.pieces.toLocaleString()} pcs
                  </span>
                </span>
                {s.status === "interactive" ? (
                  <span className="label shrink-0 rounded-full bg-sage/40 px-2 py-0.5 !text-[0.55rem]">3D ready</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {large ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="label !text-[0.6rem] text-dust">Try</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQ(s);
                submit(s);
              }}
              className="rounded-full border border-ink/25 bg-card/70 px-3 py-1 text-sm text-ink-soft transition-colors hover:border-ink hover:bg-card"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
