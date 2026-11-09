"use client";
import { useEffect, useState } from "react";
import type { BrickInstance } from "@/engine/assembly";
import { snapshot } from "@/engine/render/snapshot";

/** Real 3D thumbnail rendered by the shared offscreen renderer. */
export function Thumb({ id, bricks, size = 160, className = "", alt }: { id: string; bricks: BrickInstance[]; size?: number; className?: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // Defer so many thumbnails don't block the first paint.
    const t = window.setTimeout(() => alive && setSrc(snapshot(id, bricks, size)), 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [id, bricks, size]);
  if (!src) return <div className={`animate-pulse rounded-lg bg-cream/60 ${className}`} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className={`object-contain ${className}`} draggable={false} />;
}

const single = new Map<string, BrickInstance[]>();
export function partBricks(partId: string, colorId: string): BrickInstance[] {
  const k = `${partId}|${colorId}`;
  let b = single.get(k);
  if (!b) {
    b = [{ uid: k, partId, colorId, x: 0, y: 0, z: 0, rot: 0 }];
    single.set(k, b);
  }
  return b;
}

export function PartThumb({ partId, colorId, size = 64, className = "" }: { partId: string; colorId: string; size?: number; className?: string }) {
  return <Thumb id={`part:${partId}:${colorId}`} bricks={partBricks(partId, colorId)} size={size * 2} className={className} alt="" />;
}
