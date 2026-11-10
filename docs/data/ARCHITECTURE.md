# Data architecture: what exists today and what the pipeline adds

Written 2026-11-10 by the `lego-data-engineer` session on branch `claude/data-pipeline-fb2d34`.
Read together with [SOURCES.md](SOURCES.md), [SCHEMA.md](SCHEMA.md), [API.md](API.md) and [SETUP.md](SETUP.md).

## 1. Today (before this branch)

Tsumiki is a Next.js 16 App Router app (React 19, TypeScript 5.9, Tailwind 4, React Three Fiber 9 /
three 0.187, Vitest 5). **There is no database, no API route and no server-side data access.** Every
piece of set data is a TypeScript module compiled into the client bundle.

| Area | Files | What it holds |
| --- | --- | --- |
| Shared engine | `src/engine/**` | Framework-free model types and algorithms. Owned by the main session; this branch does not modify it. |
| Demo models | `src/data/models.ts` | Hand-authored `Instruction`s (cottage, sprout). |
| Catalog | `src/data/catalog.ts` | `SetEntry[]`: demo models plus a hand-typed list of real sets (factual metadata only, status `not-processed`). |
| Transcribed sets | `src/data/sets/21368/*`, `src/data/sets/registry.ts`, `src/data/sets/dsl.ts` | Step-exact hand transcription of LEGO 21368, in progress by six parallel sessions. `bom.ts` is the printed parts list (233 element lines, 963 model pieces + 1 brick separator). |
| Set resolution | `src/lib/sets.ts` | Merges catalog, registry and uploaded LDraw models into `SetEntry`. |
| Client storage | `src/lib/storage.ts` | Guided-build progress in `localStorage`. |
| LDraw tooling | `tools/fetch-ldraw.mjs`, `tools/pack-ldraw.mjs`, `tools/ldraw-custom/` | Download the LDraw library into git-ignored `.ldraw/`, pack per-part metadata into `src/engine/ldraw/parts-meta.json` (183 parts + 5 colours today). |

### Engine shapes the pipeline must produce

- `BrickInstance` (`src/engine/assembly.ts`): `uid, partId, colorId, x, y, z, rot` (grid units, quarter
  turns), optional `frame`, `anchor`, and `pose: LdPose` (`[x y z a b c d e f g h i]`, LDU, LDraw axes, −Y up).
  When `pose` is present it replaces the grid fields for drawing and connection checks.
- `Instruction` / `InstructionStep` (`src/engine/instructions.ts`): `steps[]` of `{bricks, note?, manualStep?, page?, label?}`,
  `provenance: "hand-authored" | "ldraw-import" | "manual-transcription"`, optional `frames: FrameDef[]` and `joins: Join[]`.
- `FrameDef` (`src/engine/frames.ts`): sub-assembly with its own grid, parent, staging transform and `attachStep`.
- `Join` (`src/engine/connect.ts`): non-stud connection between two posed parts.
- Colours (`src/engine/colors.ts`): 19 engine colour ids, each with an LDraw code. `partId` is the LDraw file name without `.dat`.
- Validators: `validateAssembly` (grid models), `validateInstruction`, and `validatePosed` (collisions, stud
  connectivity, declared joins for posed parts). The pipeline reuses `validatePosed` for assembly checks.
- `importLDraw` (`src/engine/ldraw.ts`): the browser-side importer. It reads single-file LDR only, accepts only
  upright quarter-turn, grid-aligned parts already in `PARTS`, and stops at the second `0 FILE`. That is right for
  Custom Build round trips but cannot read OMR models (MPD, sub-models, free rotations), so the pipeline has its
  own MPD parser that emits posed `BrickInstance`s.

### Build and test

- `npm test` runs Vitest over `src/**/*.test.ts` (engine suite). This branch extends the include list with
  `pipeline/**/*.test.ts`.
- `npm run typecheck` runs `tsc --noEmit` over the whole repo.
- Node 24 on the dev machine. **Docker and `psql` are not installed** (checked 2026-11-10), so tests run on
  PGlite (`@electric-sql/pglite`, real PostgreSQL 17 compiled to WASM). The production target is PostgreSQL.

### What was missing

1. A place to keep catalog data that is too large for the bundle (Rebrickable alone is ~25k sets, ~60k parts, ~1M inventory rows).
2. Provenance and licence tracking per record and per asset.
3. Verified part-identifier mappings (Rebrickable ↔ LDraw ↔ BrickLink ↔ LEGO element). `bom.ts` maps element → part
   through Rebrickable's `elements.csv`, but nothing records that per row.
4. A repeatable way to discover instructions and structured models for a set without a person doing it.
5. A processing queue, so slow stages (page extraction, AI recognition) can run, fail, resume and be reviewed.
6. Validation that decides when a model may be offered as Guided Build.
7. A server API the app can read from.

## 2. What this branch adds

```
db/migrations/              versioned SQL (0001_init.sql, …), applied in order, recorded in schema_migrations
pipeline/
  db/                       Db interface; PGlite driver (dev/test) and node-postgres driver (production); migrator
  lib/                      CSV parser, SHA-256 helpers, polite HTTP client (conditional GET, UA, delay, host allowlist)
  rebrickable/              bulk CSV importer: fetch-if-changed → validate → stage → upsert → report
  discovery/                instruction/model discovery index; adapters: ldraw-omr, brickset (key-gated), manual references
  storage/                  BlobStore interface; local filesystem driver; S3-compatible driver; asset service (licence gate, dedup)
  queue/                    Postgres job queue (FOR UPDATE SKIP LOCKED), stage registry, runner, AI provider interface (stubbed)
  ldraw/                    MPD/LDR parser → posed BrickInstances + steps, sub-model expansion
  models/                   structured-model import into the DB
  validate/                 model and catalog validators, verification status, report command
  api/                      typed read-only query functions (the contract in API.md)
  cli.ts                    `npm run data -- <command>` entry point
  fixtures/                 tiny hand-made CSV / MPD fixtures for tests (no real LEGO assets)
src/app/api/catalog/**      thin read-only Next.js route handlers over pipeline/api
docs/data/                  ARCHITECTURE, SOURCES, SCHEMA, API, SETUP
```

### Data flow

```
 Rebrickable CSVs ──fetch-if-changed──► staging tables ──validate/upsert──► catalog tables (themes, colors, parts, sets, inventories)
                                                                                 │
 Discovery adapters (OMR, Brickset*, manual refs) ──► instruction_sources (reference only by default)
                                                                                 │
                                         storage permission = allowed? ──yes──► assets (sha256, BlobStore)
                                                                                 │
                         queue: ingest → pages → segment* → recognise* → identify* → geometry → validate → emit
                                                                                 │
 LDraw/OMR model (licensed) ──parse MPD──► models + model_steps + brick_instances ──► validation ──► verification status
                                                                                 │
                                         pipeline/api ──► /api/catalog/** ──► app (Guided Build, Custom Build, minigame)
 * = needs a key, a licence decision or an AI provider; stubbed until then
```

### Principles carried into the code

- **Deterministic first.** CSV parsing, diffing, checksums, inventory reconciliation and geometry checks are plain code.
  AI stages sit behind `RecognitionProvider` and return a confidence; anything under the threshold goes to review.
- **Discovery is not permission.** Every discovered document starts as `reference_only`. Bytes are stored only when the
  source record's `storage_permission` is `allowed`, and the asset service refuses otherwise.
- **No guessed identifiers.** A mapping row needs a `source`. Matching identical strings across systems is reported as a
  *candidate* in validation, never written as a mapping.
- **Verified means verified.** A model is `verified` only when every step validates and its inventory matches the set
  inventory through verified mappings. Everything else is `draft`, `needs_review` or `rejected`.
- **The app is not changed on this branch.** The API routes are additive. Wiring the app to them is a separate decision
  for the main session (see API.md).
