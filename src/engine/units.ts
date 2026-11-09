/**
 * One coordinate system for everything.
 *
 * Grid:  x, z in studs (integers), y in plates (integers). Origin = min corner.
 * Scene: 1 unit = 1 stud pitch = 8 mm. Y is up.
 *
 * Real dimensions (mm): stud pitch 8, plate 3.2, brick 9.6, stud Ø4.8 × 1.7,
 * clearance between neighbouring bricks 0.2 (0.1 each side).
 */
export const MM = 1 / 8;
export const STUD = 1;
export const PLATE = 3.2 * MM; // 0.4
export const STUD_RADIUS = 2.4 * MM; // 0.3
export const STUD_HEIGHT = 1.7 * MM; // 0.2125
export const CLEARANCE = 0.1 * MM;

export type Vec3 = [number, number, number];
