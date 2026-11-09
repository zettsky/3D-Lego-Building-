import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkle } from "./icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Tsumiki home">
      <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true" className="transition-transform duration-500 group-hover:-rotate-6">
        <path d="M3 13.5 17 6l14 7.5v9L17 30 3 22.5z" fill="#C96B55" stroke="#252522" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 13.5 17 21l14-7.5M17 21v9" stroke="#252522" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <ellipse cx="12" cy="11.2" rx="3" ry="1.5" fill="#E8DDC9" stroke="#252522" strokeWidth="1.4" />
        <ellipse cx="22" cy="11.2" rx="3" ry="1.5" fill="#E8DDC9" stroke="#252522" strokeWidth="1.4" />
        <path d="M9 9.7v1.5M15 9.7v1.5M19 9.7v1.5M25 9.7v1.5" stroke="#252522" strokeWidth="1.2" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.45rem] font-semibold tracking-tight">tsumiki</span>
        <span className="label !text-[0.55rem] !tracking-[0.35em] text-dust">積み木 · workshop</span>
      </span>
    </Link>
  );
}

/** Black strip heading, e.g. "••• EXPLORE •••", borrowed from vintage shop manuals. */
export function Strip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-sm bg-ink px-4 py-1.5 text-card ${className}`}>
      <span className="label !tracking-[0.5em] opacity-70">•••</span>
      <span className="label !text-[0.72rem] !tracking-[0.3em]">{children}</span>
      <span className="label !tracking-[0.5em] opacity-70">•••</span>
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col items-start gap-3">
      <span className="label inline-flex items-center gap-2 text-terracotta">
        <Sparkle size={10} /> {kicker}
      </span>
      <h2 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {children ? <p className="max-w-xl text-ink-soft/80">{children}</p> : null}
    </div>
  );
}

export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "sage" | "terracotta" | "ink" }) {
  const tones = {
    plain: "border-ink/25 text-ink-soft bg-card",
    sage: "border-sage-deep/50 bg-sage/30 text-ink",
    terracotta: "border-terracotta/50 bg-terracotta/12 text-terracotta-deep",
    ink: "border-ink bg-ink text-card",
  };
  return <span className={`label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 !text-[0.6rem] ${tones[tone]}`}>{children}</span>;
}

export function StatusTag({ interactive }: { interactive: boolean }) {
  return interactive ? (
    <Tag tone="sage">
      <span className="h-1.5 w-1.5 rounded-full bg-sage-deep" /> Interactive · verified
    </Tag>
  ) : (
    <Tag>
      <span className="h-1.5 w-1.5 rounded-full border border-dust" /> Not processed yet
    </Tag>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-rule ${className}`} />;
}
