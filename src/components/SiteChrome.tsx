"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./ui";
import { IconClose } from "./icons";

const NAV = [
  { href: "/explore", label: "Explore Sets" },
  { href: "/#how", label: "How It Works" },
  { href: "/my-builds", label: "My Builds" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Logo />
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {NAV.map((n) => {
          const active = n.href !== "/#how" && path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`relative rounded-full px-3.5 py-2 text-[0.92rem] transition-colors hover:bg-cream/70 ${active ? "text-ink" : "text-ink-soft/80"}`}
            >
              {n.label}
              {active ? <span className="absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full bg-terracotta" /> : null}
            </Link>
          );
        })}
        <Link href="/upload" className="btn btn-secondary ml-3 !px-4 !py-1.5 text-sm">
          Upload
        </Link>
      </nav>
      <button className="tool md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)}>
          <nav
            aria-label="Mobile"
            className="paper absolute right-3 top-3 flex w-64 flex-col gap-1 rounded-2xl border-[1.5px] border-ink p-4 shadow-[4px_4px_0_#252522]"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tool mb-2 self-end" aria-label="Close menu" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
            {[...NAV, { href: "/upload", label: "Upload instructions" }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-serif text-lg hover:bg-cream">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-md text-sm text-dust">
            Tsumiki is an independent fan project. It is not affiliated with, endorsed or sponsored by the LEGO Group. LEGO® is a
            trademark of the LEGO Group.
          </p>
        </div>
        <div className="label flex flex-wrap gap-x-6 gap-y-2 text-dust">
          <Link href="/explore" className="hover:text-ink">Explore</Link>
          <Link href="/upload" className="hover:text-ink">Upload</Link>
          <Link href="/my-builds" className="hover:text-ink">My builds</Link>
          <Link href="/about" className="hover:text-ink">About & data</Link>
        </div>
      </div>
    </footer>
  );
}
