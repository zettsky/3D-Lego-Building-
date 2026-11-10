# Tsumiki 積み木 — a little workshop for bricks

An interactive 3D brick-building website. Follow building instructions as step-by-step 3D animations (**Guided Build**), or invent an original model using exactly the bricks from one set (**Custom Build**). Both modes run on **one shared engine** (`src/engine`).

> Independent fan project. Not affiliated with, endorsed or sponsored by the LEGO Group. LEGO® is a trademark of the LEGO Group.

The full product and engineering plan (reference analysis, identity, information architecture, feasibility, data sources and licensing, engine design, database schema, challenges, roadmap) is in [docs/PLAN.md](docs/PLAN.md).

## Run it locally

Requirements: Node.js 20+ (tested on Node 24).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine test suite (Vitest)
npm run typecheck
npm run build && npm start   # production build
```

Places to start:

- `/` the landing page
- `/build/tsumiki-cottage` Guided Build
- `/studio/tsumiki-cottage` Custom Build
- `/build/lego-21368` Snoopy's Doghouse, transcribed from the official manual
- `/upload` LDraw import (export a model from the studio as `.ldr` and upload it to see the round trip)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · React Three Fiber 9 + Drei · Three.js · Motion · Fuse.js · Vitest.

## Project layout

```
src/engine/            the shared engine, framework-free and unit tested
  parts.ts colors.ts units.ts      part library, colours, real dimensions
  assembly.ts                      BrickInstance, occupancy, collisions, stud graph, validation
  snapping.ts                      LEGO-aware placement (used by the preview AND the commit)
  inventory.ts history.ts          derived inventory, undo/redo
  instructions.ts                  structured instruction format + validator
  explode.ts                       smart separation vectors
  guidedMachine.ts studio.ts       state machines for both modes
  estimate.ts ldraw.ts             time predictions, LDraw import/export
  render/                          geometry cache, Brick, Workspace, thumbnail renderer
src/components/guided  src/components/studio   the two mode UIs
src/data/              demo models + catalog
src/app/               routes
```

## Phase 2 status

**Working:**

- Sub-assemblies (`src/engine/frames.ts`): parts of a model built on their own grid, shown beside the model while you build them, then gliding into place on their attach step, at any orientation. This is what sideways building (SNOT), walls built lying down and angled roofs need.
- Half-stud lattice for collisions and connections, so jumper plates and half-stud offsets work.
- About 70 parts with real dimensions: panels, arches, inverted, cheese and curved slopes, double slopes, bricks with studs on the side, brackets, clips, round plates and tiles, grass, and a printed SNOOPY tile. Colours now use LEGO names with LDraw reference values.
- Instanced rendering: already-placed bricks draw in one call per part and colour.
- **LEGO Ideas 21368 Peanuts: Snoopy's Doghouse**, the doghouse portion: manual steps 79–225 (bags 4–9), 387 pieces, 116 steps, with each step's manual step number and page. The lawn panels are built upright and laid flat, the night-sky walls are built flat and stood up, and the gables, ceiling, front with the SNOOPY sign, side walls and roof panels are built separately and attached, as in the manual. Colours come from the set's parts list.

**Approximate / not done:**

- The doghouse was transcribed by reading the manual's pictures. Visible structure, piece types and colours follow the manual. Bricks hidden inside walls are a best reading, a few sizes were adjusted so the sub-assemblies fit together, and hinges, clips and the two quarter-circle corners are simplified. Steps with simplifications say so.
- Snoopy, Woodstock, the typewriter and the campfire (steps 1–78 and 226 onward) are not modelled yet. They need ball joints and free-angle hinges.
- Part shapes are parametric approximations. LDraw meshes are planned for Phase 3.
- The manual itself is not redistributed. Only the model data derived from it is in this repository.

**Tested:** 34 engine tests. The 9 new ones cover half-stud connections and collisions, sideways-held (anchored) bricks, nested sub-assembly transforms and staging, and the doghouse: no collisions or unsupported pieces in any sub-assembly at any step, manual step order, parts-list colours, and every sub-assembly attached by the end. Checked by hand in the browser: set page, Guided Build at several steps (panels laying down, the sign, the roof attaching), and Custom Build with the doghouse inventory. The production build passes.

## Phase 1 status

**Working (fully implemented):**

- Shared engine: one grid coordinate system, procedural bricks, plates, tiles and 45° slopes at real LEGO dimensions, voxel collisions, stud-connection graph, assembly validation.
- Guided Build: staggered glide-and-snap animations, previous/next, replay (re-animates only the current step), rewind (instant exact restore), auto-play, 0.5–2× speed, step slider, keyboard shortcuts, per-step camera focus that never takes control away, reset/fit camera, piece call-outs with real 3D thumbnails, autosaved progress.
- Ghost Mode: translucent sage previews of the next step with outlines and terracotta hover highlight. Ghosts fade out and the placement animation plays when you advance.
- Exploded View: separation that knows about layers (bricks stacked within one step never pass through each other), sideways fallback under overhangs, 0–100 % slider, dashed connector guides. Explode/ghost/animation rules live in a tested reducer.
- Custom Build: the set's exact inventory (by type or by colour, with search), click-to-place and drag-and-drop, snapping ghost (sage = fits, terracotta = blocked, with the reason), rotate, move, duplicate, delete (refused if it would leave bricks floating), undo/redo, grid toggle, autosave, rename, screenshot PNG, export `.ldr` / JSON.
- Search: fuzzy matching and autocomplete across name, number, theme, collection and keywords, plus theme and "interactive only" filters.
- LDraw upload: deterministic import with staged status. Unknown parts, colours or rotations are flagged for review, never guessed.
- My Builds: resume, reset, rename, duplicate and delete.

**Demonstration:**

- Catalog: two original models (The Little Cottage, 50 pcs / 12 steps; Sprout Pot, 17 pcs / 7 steps) with validated instructions. Real LEGO sets carry factual metadata only and are clearly marked "not processed".
- Time estimates are labelled *predicted* ranges based on piece types and pace. No measured builder data exists yet.

**Planned:** PDF and photo conversion (Phase 6), the LDraw part library and Technic/hinge connections (Phase 2/5), backend with accounts and sync (Phase 6/8), measured timing with consent (Phase 7).

**Tested:** 25 engine tests: rotations and footprints, collisions, tile and slope stud rules, both demo models validated step by step, snapping, the studio reducer (inventory limits, undo/redo consistency, deletes that would strand bricks, move as one undo step, duplicate), Guided state-machine rules, no overlaps in exploded steps, a lossless LDraw round trip, and estimate behaviour. The UI was checked by hand in a browser.
