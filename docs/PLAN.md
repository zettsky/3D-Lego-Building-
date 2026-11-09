# Tsumiki — Product & Engineering Plan

> *Tsumiki* (積み木) is Japanese for "building blocks". This document answers the ten
> "do this first" questions from the master brief, then records what Phase 1 actually ships.
>
> Tsumiki is an independent fan project. It is **not affiliated with, endorsed by or sponsored
> by the LEGO Group**. LEGO® is a trademark of the LEGO Group.

---

## 1. Reference analysis

| Reference | What we take | What we leave |
|---|---|---|
| **むちねこ concept sheet** (monochrome cat platformer) | Warm off-white paper, near-monochrome palette (111/333/777/BEB8AD/E6E1D7/F6F4EE), widely tracked mono labels (`WEIGHT`, `SYSTEM`, `ITEMS`), thin hairline dividers, a single editorial headline with a short Japanese-style sub line, small state diagrams with arrows (light → normal → heavy). | The cat, the platformer, the phone frame. |
| **"Jackie" portfolio** (red notebook on black) | The *booklet as stage*: content lives inside a rounded, bound card with grid paper, hand-drawn line illustrations in one ink colour, ribbon bookmark, a doodle margin. Serif display type with personality. | Black page background, the stamp border, the specific doodles. |
| **Siestan "进货" shop UI** (cream / red / sage) | Strong cream + terracotta-red + sage-green trio, dashed "ticket" borders, chunky black header strip with `••• SHOP •••` style labels, sparkle `✦` ornaments around titles, pill segmented controls (保守 / 稳健 / 激进) and slider with a stamped thumb. | Mascots, Chinese copy, the dense game-shop layout. |
| **Fumayo bookstore product card** (graph paper) | Graph-paper canvas with **red margin rules** like an exercise book, typewriter/mono UI text, small outlined boxes for price/quantity, fully responsive two-column → one-column layout. | The brand, the bookstore content. |

**Distilled principles**

1. *Paper first.* Every surface is a sheet: warm paper, faint grid, a margin rule, a hairline.
2. *Two inks + one accent.* Charcoal for text, terracotta for action, sage for "preview / ok".
3. *Manual typography.* Expressive serif for big numbers and titles, mono for technical labels, clean sans for UI.
4. *Ticket & stamp controls.* Dashed borders, pill toggles, tactile buttons with a hard offset shadow that "presses in".
5. *The model is the illustration.* Decoration lives in margins; the 3D workspace is always the hero.

## 2. Product identity

- **Name:** Tsumiki — *a little workshop for bricks.*
- **Voice:** quiet, encouraging, a bit stationery-shop. ("Find a set to begin…", "Step done. Take your time.")
- **Typography:** **Fraunces** (display, soft optical sizes, used for step numerals and headlines) · **DM Sans** (interface) · **IBM Plex Mono** (labels, part IDs, counters — always uppercase + tracked).
- **Palette** (CSS tokens in `src/app/globals.css`):

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F6F1E7` | page background |
| `cream` | `#E8DDC9` | secondary surfaces, inset wells |
| `ink` | `#252522` | text, header strip |
| `terracotta` | `#C96B55` | primary action, invalid placement |
| `sage` | `#A4B18C` | ghost previews, valid placement, "verified" |
| `dust` | `#8A7666` | secondary text, rules |
| `card` | `#FFFDF8` | cards and overlays |
| `rule` | `#D9CDB8` | grid + hairlines |

- **Motif:** the instruction booklet. Pages are bound cards with a red margin rule; steps use a big serif numeral `STEP 024 / 156`; sections are headed by a black strip with mono labels and `✦` ornaments.

## 3. Information architecture

```
/                      Landing — hero (assembling bricks), search, modes, curated sets, how it works
/explore?q=            Search — autocomplete, fuzzy match, filters (theme · interactive only)
/sets/[id]             Set details — 3D preview (verified only), facts, Start Building / Create Your Own
/build/[id]            Guided Build  ─┐ both mount the same engine
/studio/[id]           Custom Build  ─┘ (src/engine)
/my-builds             Saved guided progress + custom projects (resume, rename, duplicate, delete)
/upload                Import instructions (LDraw today; PDF/image pipeline planned)
/about                 About, data sources, legal
```

**Guided journey:** search → set → *Start Building* → step 1 animates in → Next / Space → (optional Ghost: see next step; Exploded: pull apart current step) → progress autosaves → resume from My Builds.

**Custom journey:** search → set → *Create Your Own* → inventory of exactly that set's parts → click or drag a part → ghost follows cursor and snaps to studs → click to place → select / rotate / move / duplicate / delete / undo → save → resume or export `.ldr`.

## 4. Technical feasibility — instructions → accurate 3D

What is **realistic**:

- **Structured sources are the backbone.** If a set exists as an LDraw model (`.ldr`/`.mpd` with `0 STEP` meta lines), we get exact part IDs, colours, 4×4 transforms and step boundaries. That is deterministic and accurate — Tsumiki already imports these (`src/engine/ldraw.ts`).
- **PDF/image pages are hard.** Per page we can deterministically extract images and step numbers (pdf.js / OCR), and a vision model can *propose* the parts call-out (part + colour + qty) because the call-out box is a small, constrained recognition problem. Recovering **exact 3D placement** from a 2D isometric drawing is an open research problem: depth ambiguity, occlusion, sub-assemblies, flipped views.
- **Therefore the pipeline is "propose → verify":** AI proposes; deterministic geometry checks (collision, stud connectivity, inventory balance vs. the set's part list, step-to-step consistency) accept or reject; anything uncertain becomes a **review task** for a human. Nothing un-validated is ever shown as an animated instruction.

Pipeline stages (each a background job, results cached by document hash):

1. ingest (hash, store) → 2. page split + step segmentation → 3. call-out detection → 4. part/colour recognition (vision + inventory prior) → 5. candidate placement (from LDraw match if one exists, else constrained search on studs) → 6. geometric validation → 7. review queue → 8. emit `Instruction` JSON → 9. engine plays it. Replaying never re-calls AI.

## 5. Data sources & licensing

| Need | Source | Licence / caution |
|---|---|---|
| Brick geometry | **LDraw parts library** (ldraw.org) | CC BY 2.0 (parts since 2011) — attribution required. Load via three.js `LDrawLoader` in Phase 2b. |
| Set inventories & metadata | **Rebrickable** API / CSV dumps | Free API with key; their terms require attribution and limit bulk redistribution. |
| Set metadata/images | **Brickset** API | Key required; images are LEGO copyright → display only where permitted, never re-host. |
| Official instruction PDFs | LEGO.com building instructions | Viewable by consumers; **redistribution is not granted**. Store user uploads privately, never republish. |
| Structured instructions | LDraw OMR (Official Model Repository), user `.ldr` / Studio exports | OMR files carry their own author licences; keep author attribution. |

Phase 1 uses **no third-party geometry or images**. Bricks are generated procedurally from real LEGO dimensions (8 mm stud pitch, 9.6 mm brick, 3.2 mm plate, Ø4.8 × 1.7 mm studs). Catalog entries for real sets contain only factual metadata (name, number, theme, piece count) and are clearly marked "instructions not processed".

## 6. Shared engine design (`src/engine`)

```
             ┌──────────── authoritative, serialisable data ────────────┐
parts.ts     PartDef  {id, ldraw, w, d, h, studs mask, category}
colors.ts    ColorDef {id, ldraw code, hex}
assembly.ts  BrickInstance {uid, partId, colorId, x,y,z (grid), rot 0-3, step?, group?}
             occupancy · collision · stud connections · support validation
inventory.ts Inventory = set part list − bricks in use   (derived, never stored separately)
history.ts   undo/redo over immutable brick arrays (inventory follows automatically)
snapping.ts  pointer cell + part + rotation → candidate placement + validity reason
instructions.ts Instruction {steps: BrickInstance[][]} → assemblyAt(step)
explode.ts   smart separation vectors (assembly direction + in-step stacking + lateral spread)
guidedMachine.ts pure reducer: step / playing / animation / exploded / ghost preference
estimate.ts  predicted time ranges (labelled as predictions)
ldraw.ts     LDraw import/export (deterministic structured path)
             └─────────────────────────────────────────────────────────┘
render/      geometry cache (one BufferGeometry per part) · shared materials ·
             BrickMesh · GhostMaterial · Workspace (canvas, lights, camera, controls)
```

- **One grid coordinate system:** x/z in studs, y in plates. Scene units: 1 = one stud (8 mm).
- **Guided** = `assemblyAt(step)` fed to `Workspace`; animation is a *visual offset* per brick computed each frame.
- **Ghost Mode** = the same `BrickMesh` with `ghost` material, fed `steps[step+1]` (Guided) or the snapping candidate (Custom).
- **Exploded View** = the same meshes with a visual offset from `explode.ts`; saved positions never change.
- **Custom** = user commands → `history` → new brick array → `Workspace`. Inventory is derived from that array, so undo/redo cannot desync it.

## 7. Database schema (Phase 6 target — PostgreSQL)

```
lego_set (id PK, set_num UNIQUE, name, theme_id FK, year, piece_count, description, image_url, source)
theme (id PK, name, parent_id FK NULL)
part (id PK, ldraw_id UNIQUE, name, category, w, d, h, geometry_key)
color (id PK, ldraw_code UNIQUE, name, hex)
set_inventory (set_id FK, part_id FK, color_id FK, quantity CHECK > 0, PK(set_id, part_id, color_id))
instruction_doc (id PK, set_id FK NULL, uploader_id FK NULL, kind ENUM(pdf,image,ldraw), sha256 UNIQUE, storage_key, visibility)
processing_job (id PK, doc_id FK, stage, status ENUM(queued,running,needs_review,failed,done), error, started_at, finished_at)
review_task (id PK, job_id FK, step_index, reason, payload JSONB, resolved_by FK NULL, resolved_at)
instruction (id PK, set_id FK, doc_id FK, version, status ENUM(draft,verified), validated_at)
instruction_step (instruction_id FK, idx, camera JSONB, notes, PK(instruction_id, idx))
assembly_op (id PK, instruction_id FK, step_idx, part_id FK, color_id FK, x,y,z INT, rot SMALLINT, group_id NULL)
app_user (id PK, email UNIQUE, pace ENUM(relaxed,standard,experienced), timing_consent BOOL)
guided_progress (user_id FK, instruction_id FK, step_idx, updated_at, PK(user_id, instruction_id))
custom_project (id PK, user_id FK, set_id FK, name, bricks JSONB, thumbnail_key, created_at, updated_at)
build_session (id PK, user_id FK, instruction_id FK, started_at, ended_at, active_seconds, steps_completed, consent_version)
time_submission (id PK, user_id FK NULL, set_id FK, minutes, source ENUM(self_report,tracked), created_at)
```

`set_inventory` is the contract between both modes: Custom Build may not exceed it, and the instruction validator checks that `assembly_op` rows sum to it. `custom_project.bricks` uses the same `BrickInstance` JSON as the engine.

## 8. Major engineering challenges

| Challenge | MVP answer | Long-term |
|---|---|---|
| PDF → 3D placement | Don't. Import structured LDraw; mark PDFs "planned" | Propose/verify pipeline + human review |
| Real part geometry | Procedural bricks, plates, tiles, 45° slopes with exact dimensions | LDraw library + LOD + instancing |
| Connection model | Stud-on-top grid connections, 90° rotations | Connection-point graph (Technic pins, hinges, SNOT) |
| Collision | Voxel occupancy (stud × plate cells) — exact for box parts, conservative for slopes | Mesh/convex collision for specialty parts |
| Animation vs. truth | Animations are per-frame visual offsets; reducer owns truth | Same |
| Explode without overlaps | Direction = assembly direction + in-step stack order + lateral spread | Sub-assembly–aware disassembly planning |
| Time estimates | Labelled predictions from piece mix + pace | Consent-based measured sessions |
| Licensing | No official PDFs/images bundled | Partnerships / user-owned uploads only |

## 9. Phased plan

1. **Phase 1 — Design system + functional prototype** *(this commit)* — all pages, both builders, verified demo models.
2. **Phase 2 — Engine hardening** — LDraw geometry loader, instancing, connection-point graph, sub-assemblies.
3. **Phase 3 — Guided Build data** — per-step cameras, sub-assembly callouts, larger imported models.
4. **Phase 4 — Ghost/Explode** — multi-step ghosts, sub-assembly explode, connector annotations.
5. **Phase 5 — Custom Build** — rotation around arbitrary pivots, multi-select, SNOT/Technic connections.
6. **Phase 6 — Backend** — FastAPI + Postgres + object storage + job queue; Rebrickable sync; PDF pipeline with review UI.
7. **Phase 7 — Time estimation** — consent flow, session tracking, measured vs predicted.
8. **Phase 8 — Production** — auth, server persistence, e2e tests, monitoring, deploy.

Dependencies: 2 → (3,4,5) share the engine; 6 needs 2's part table; 7 needs 6's sessions; 8 last.
