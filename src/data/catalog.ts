/**
 * Set catalog.
 *
 * - `tsumiki-*` entries are original demo models with verified, interactive instructions.
 * - The other entries are real LEGO® sets carrying ONLY factual metadata (name, number,
 *   theme, piece count). Their instructions have NOT been processed, and no official images
 *   are bundled. They exist so search behaves realistically and so the UI can show what an
 *   unprocessed set looks like. Phase 6 replaces this file with the database.
 */
import { COTTAGE, SPROUT } from "./models";
import { instructionInventory } from "@/engine/instructions";
import { totalPieces } from "@/engine/inventory";
import type { Instruction } from "@/engine/instructions";

export interface SetEntry {
  id: string;
  setNumber: string;
  name: string;
  theme: string;
  collection?: string;
  pieces: number;
  year?: number;
  keywords: string[];
  description: string;
  status: "interactive" | "not-processed";
  instruction?: Instruction;
  official: boolean;
}

const demo = (e: Omit<SetEntry, "pieces" | "status" | "official"> & { instruction: Instruction }): SetEntry => ({
  ...e,
  pieces: totalPieces(instructionInventory(e.instruction)),
  status: "interactive",
  official: false,
});

const real = (setNumber: string, name: string, theme: string, pieces: number, year: number, keywords: string[], collection?: string): SetEntry => ({
  id: `lego-${setNumber}`,
  setNumber,
  name,
  theme,
  collection,
  pieces,
  year,
  keywords,
  description:
    "Catalog metadata only. Interactive instructions for this set have not been processed yet — upload a structured model (LDraw) to try it, or check back later.",
  status: "not-processed",
  official: true,
});

export const CATALOG: SetEntry[] = [
  demo({
    id: "tsumiki-cottage",
    setNumber: "TSK-001",
    name: "The Little Cottage",
    theme: "Tsumiki Originals",
    collection: "Little Houses",
    keywords: ["house", "home", "roof", "garden", "cottage", "beginner"],
    description:
      "A whitewashed cottage with a terracotta roof, a sand-green door and a tiny garden. Twelve calm steps that teach interlocking walls and stepped slope roofs.",
    instruction: COTTAGE,
  }),
  demo({
    id: "tsumiki-sprout",
    setNumber: "TSK-002",
    name: "Sprout Pot",
    theme: "Tsumiki Originals",
    collection: "Desk Friends",
    keywords: ["plant", "pot", "flower", "botanical", "small", "beginner"],
    description: "A tiny potted sprout for your desk. A gentle first build: a pinwheel pot, soil, a stem and three leaves.",
    instruction: SPROUT,
  }),
  real("10281", "Bonsai Tree", "Icons", 878, 2021, ["botanical", "plant", "tree", "flowers"], "Botanical Collection"),
  real("10280", "Flower Bouquet", "Icons", 756, 2021, ["botanical", "flowers", "rose"], "Botanical Collection"),
  real("10311", "Orchid", "Icons", 608, 2022, ["botanical", "flower", "plant"], "Botanical Collection"),
  real("21058", "Great Pyramid of Giza", "Architecture", 1476, 2022, ["egypt", "landmark", "history"]),
  real("21042", "Statue of Liberty", "Architecture", 1685, 2018, ["new york", "landmark", "usa"]),
  real("21318", "Tree House", "Ideas", 3036, 2019, ["tree", "house", "forest"]),
  real("42115", "Lamborghini Sián FKP 37", "Technic", 3696, 2020, ["car", "supercar", "vehicle"]),
  real("42083", "Bugatti Chiron", "Technic", 3599, 2018, ["car", "supercar", "vehicle"]),
  real("75192", "Millennium Falcon", "Star Wars", 7541, 2017, ["spaceship", "ucs", "han solo"], "Ultimate Collector Series"),
  real("75313", "AT-AT", "Star Wars", 6785, 2021, ["walker", "ucs", "empire"], "Ultimate Collector Series"),
  real("10497", "Galaxy Explorer", "Icons", 1254, 2022, ["space", "classic space", "spaceship"]),
  real("10294", "Titanic", "Icons", 9090, 2021, ["ship", "boat", "history"]),
];

export function getSet(id: string): SetEntry | undefined {
  return CATALOG.find((s) => s.id === id);
}

export const THEMES = [...new Set(CATALOG.map((s) => s.theme))];
