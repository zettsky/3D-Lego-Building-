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

## Status

| Section | Manual steps | Pages | Status |
| --- | --- | --- | --- |
| Snoopy: torso, legs, belly (bag 1) | 1–27 | 11–26 | steps 1–2 transcribed and checked |
| Snoopy: head (bags 2–3) | 28–78 | 27–59 | not started |
| Woodstock | W1–W11 | 60–62 | not started |
| Lawn (bag 4) | 79–127 | 64–96 | not started (an earlier approximate version exists) |
| Night sky (bag 5) | 128–162 | 97–116 | not started (approximate version exists) |
| Doghouse (bags 6–9) | 163–225 | 117–174 | not started (approximate version exists) |
| Typewriter display (bag 10) | 226–254 | 176–205 | not started |
| Campfire display (bag 10) | 226–244 | 206–224 | not started |
