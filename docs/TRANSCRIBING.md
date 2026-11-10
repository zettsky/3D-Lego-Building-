# Transcribing a manual into an exact 3D model

How set 21368 (Peanuts: Snoopy's Doghouse) is being transcribed, step by step, from its
official building instructions. The goal is the manual's model exactly: every part from the
parts list, in the step that adds it, at the position and orientation the picture shows.

## Sources

- The manual PDF (owned by the user, not committed). Pages are rendered with `pypdfium2`.
- `src/data/sets/21368/bom.ts`: the parts list printed on pages 228–230 (element ID and
  quantity), mapped to part design and colour with the Rebrickable element table.
  963 model pieces plus the brick separator.
- Part geometry: the LDraw parts library (CC BY 2.0). `npm run ldraw:fetch` downloads it to
  `.ldraw/`; `npm run ldraw:pack` packs the used parts into `src/engine/ldraw/parts-meta.json`
  and `public/ldraw/meshes.json`.

## Coordinates

Each sub-build uses the manual's own camera for that sub-build:

- `+x` runs toward the **lower right** of the page, `+z` toward the **lower left**, `y` is up.
- Grid units: studs in x and z, plates in y (a brick is 3 plates, a stud is 2.5 plates high).
- `put(part, colour, [x, yPlates, z], R)` places the part so that the min corner of its
  footprint box is at `[x, z]` and its bottom at plate height `y`, with orientation `R`.
  `R` says where the part's own axes point: `UP` (studs up), `FRONT`/`BACK`/`LEFT`/`RIGHT`
  (studs facing −z/+z/−x/+x), `DOWN`, `yaw(n)` quarter turns, `turn(axis, degrees)`.
- `raw(part, colour, [x, y, z] in LDU, R)` is for parts placed by their LDraw origin (axles,
  round parts on axles, ball joints). LDU: 1 stud = 20, 1 plate = 8, −Y is up.
- Sub-builds are frames (`kit.frame`) with a staging pose (where the manual shows them while
  they are built) and an attach step.

## The loop for each step

1. Read the call-out: parts and counts must match the parts list.
2. Place each part. When a picture is ambiguous, look at the following steps, where the same
   area is often visible from another side.
3. Check in the step viewer: `/dev/step/21368?s=<step>` shows the model after that step from
   the manual's camera (`&v=x,y,z` to change the view, `&only=<frame>` for one sub-build), with
   the step's new parts outlined. Compare it to the page.
4. `npm test` must stay green:
   - no part or colour outside the parts list, never more than the list contains;
   - every part posed, no box-like parts overlapping;
   - within each sub-build all parts are connected through studs (taken from the LDraw
     geometry) or through declared joins (axles, pins, clips, ball joints, hinges).

## Working in parallel

Several sessions transcribe at the same time, in this same checkout, each owning its files:

| Section | File(s) | Kit / uid prefix |
| --- | --- | --- |
| Snoopy bag 1 (steps 1–28) | `src/data/sets/21368/snoopy.ts` | `sn` |
| Snoopy head (29–78) | `snoopyHead.ts` | `sh` |
| Woodstock (W1–W11) | `woodstock.ts` (+ the 5648 head shape, see below) | `wd` |
| Lawn + night sky (79–162) | `lawn.ts`, `sky.ts` | `lw`, `sk` |
| Doghouse (163–225) | `doghouse.ts` | `dh` |
| Displays (226–254, campfire 226–244) | `displays.ts` | `tw`, `cf` |

Rules:

- Edit only your own files. If something shared needs changing (engine, dsl.ts, index.ts,
  tests, pack tool, catalog), describe it in your final report instead of editing it.
- Frame ids must start with your prefix (e.g. `sh-head`, `dh-roof-left`) so they never clash.
- Committing: `git add <your files only>`, then
  `git commit -m "21368 <section>: steps A–B" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`,
  then `git push origin main`. Never `git add -A`. If git reports `index.lock`, wait a moment
  and retry. Commit after every few steps.
- `npm test` must stay green before each commit. The parts-list test is shared: if it fails on
  a part you did not use, another session has over-used it; report it rather than "fixing" it.
- The dev server already runs on http://localhost:3005; do not start another. The step viewer:
  `/dev/step/21368?s=<step>` (campfire display: `/dev/step/21368-campfire?s=<step>`), with
  `&only=<frame id>` to show one sub-build.
- Sections that attach to another section (head onto Snoopy's ball joint, Snoopy and Woodstock
  onto the roof, the house onto the lawn) place their own frames relative to the main model.
  Read the other section's file for the anchor part when it exists; otherwise leave the final
  attach pose as a clearly marked TODO with the step number, and say so in your report.
- Woodstock's head, part 5648 "Helmet Dome, No Stud", has no 3D model in the LDraw library or
  on the unofficial tracker. Its *placement* is exact like any other part; its *shape* must be
  built: write an LDraw-format part file in `tools/ldraw-custom/parts/5648.dat` (committed; the pack tool searches it) from the part's real
  dimensions, pack it, and mark it in the report as the only hand-made part shape.

## Status

| Section | Manual steps | Pages | Status |
| --- | --- | --- | --- |
| Snoopy: torso, legs, back, belly (bag 1) | 1–28 | 11–26 | done: torso (1–12, stands upright from 12), lower body and feet (13–20, frame `sn-hip`, attached 21), back and tail (22–26, `sn-back`, attached 27), belly (28, `sn-belly`); joins checked overlap-free against the torso |
| Snoopy: head (bags 2–3) | 29–78 | 27–59 | steps 29–45 transcribed (side panel A partly); 46 unresolved (see TODO), 47–78 to do |
| Woodstock | W1–W11 | 60–62 | done (roof attach pose TODO); 5648 head is the only hand-made part shape |
| Lawn (bag 4) | 79–127 | 64–96 | not started |
| Night sky (bag 5) | 128–162 | 97–116 | not started |
| Doghouse (bags 6–9) | 163–225 | 117–174 | steps 163–177 transcribed (back wall, ceiling); 178–225 to do |
| Typewriter display (bag 10) | 226–254 | 183–205 | steps 226–234 transcribed; 235–254 to do |
| Campfire display (bag 10) | 226–244 | 206–224 | not started |

The parallel sessions were stopped on 2026-11-10 to save usage; the remaining steps continue in a
single session, in manual order, following the same rules.
