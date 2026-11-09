import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tsumiki — a little workshop for bricks", template: "%s · Tsumiki" },
  description:
    "Follow building instructions as step-by-step 3D animations, or invent your own model from a set's exact bricks.",
};

export const viewport: Viewport = { themeColor: "#F6F1E7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${plexMono.variable}`}>
      <body className="paper min-h-dvh">{children}</body>
    </html>
  );
}
