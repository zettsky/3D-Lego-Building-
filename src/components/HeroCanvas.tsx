"use client";
import dynamic from "next/dynamic";

/** Client-only wrapper so the WebGL hero never renders on the server. */
export const HeroCanvas = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden="true" />,
});
