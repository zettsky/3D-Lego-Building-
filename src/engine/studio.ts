/**
 * Custom Build reducer. Every user command goes through here, re-validated against the
 * same snapping/inventory code the UI previews with — the UI is never trusted blindly.
 * Inventory is derived from `history.present`, so undo/redo restore geometry and
 * inventory together.
 */
import { buildConnectionGraph, cellsOf, newUid, type BrickInstance, type Bounds2D, type Rot } from "./assembly";
import { createHistory, pushHistory, redo, undo, type History } from "./history";
import { canTake, type InventoryLine } from "./inventory";
import { checkPlacement, columnTops, snapCandidate } from "./snapping";

export interface ActivePart {
  partId: string;
  colorId: string;
  rot: Rot;
}

export interface StudioState {
  history: History<BrickInstance[]>;
  inventory: InventoryLine[];
  bounds: Bounds2D;
  active: ActivePart | null;
  /** brick picked up for moving — still counted in inventory, hidden from the scene */
  moving: BrickInstance | null;
  selected: string | null;
  message: string | null;
}

export type StudioAction =
  | { type: "PICK_PART"; partId: string; colorId: string }
  | { type: "ROTATE" }
  | { type: "PLACE"; anchor: { x: number; z: number } }
  | { type: "DROP"; partId: string; colorId: string; anchor: { x: number; z: number } }
  | { type: "SELECT"; uid: string | null }
  | { type: "DELETE" }
  | { type: "DUPLICATE" }
  | { type: "MOVE" }
  | { type: "CANCEL" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" }
  | { type: "LOAD"; bricks: BrickInstance[] }
  | { type: "DISMISS_MESSAGE" };

export function initStudio(inventory: InventoryLine[], bounds: Bounds2D, bricks: BrickInstance[] = []): StudioState {
  return { history: createHistory(bricks), inventory, bounds, active: null, moving: null, selected: null, message: null };
}

/** Bricks currently shown as solid (excludes a brick being moved). */
export function visibleBricks(s: StudioState): BrickInstance[] {
  return s.moving ? s.history.present.filter((b) => b.uid !== s.moving!.uid) : s.history.present;
}

function wouldStrand(bricks: BrickInstance[], removeUid: string): boolean {
  const rest = bricks.filter((b) => b.uid !== removeUid);
  const { grounded } = buildConnectionGraph(rest);
  return rest.some((b) => !grounded.has(b.uid));
}

const msg = (s: StudioState, message: string): StudioState => ({ ...s, message });

export function studioReducer(s: StudioState, a: StudioAction): StudioState {
  const bricks = s.history.present;
  switch (a.type) {
    case "PICK_PART": {
      if (s.moving) return msg(s, "Place or cancel the brick you are moving first.");
      if (!canTake(s.inventory, bricks, a.partId, a.colorId)) return msg(s, "None of those left in this set.");
      const same = s.active && s.active.partId === a.partId && s.active.colorId === a.colorId;
      return { ...s, active: same ? null : { partId: a.partId, colorId: a.colorId, rot: s.active?.rot ?? 0 }, selected: null, message: null };
    }
    case "ROTATE": {
      if (s.active) return { ...s, active: { ...s.active, rot: (((s.active.rot + 1) % 4) as Rot) } };
      if (!s.selected) return s;
      const b = bricks.find((x) => x.uid === s.selected);
      if (!b) return s;
      const turned = { ...b, rot: ((b.rot + 1) % 4) as Rot };
      const check = checkPlacement(bricks, turned, s.bounds, b.uid);
      if (!check.valid) return msg(s, "Not enough room to turn it here.");
      const next = bricks.map((x) => (x.uid === b.uid ? turned : x));
      const { grounded } = buildConnectionGraph(next);
      if (next.some((x) => !grounded.has(x.uid))) return msg(s, "Turning it would leave other bricks unsupported.");
      return { ...s, history: pushHistory(s.history, next), message: null };
    }
    case "PLACE": {
      if (!s.active) return s;
      const ignore = s.moving?.uid;
      const cand = snapCandidate(bricks, s.active.partId, s.active.colorId, s.active.rot, a.anchor, s.bounds, {
        uid: s.moving?.uid ?? newUid(),
        ignoreUid: ignore,
      });
      if (!cand.valid) return msg(s, cand.reason ?? "It doesn't fit there.");
      if (s.moving) {
        const next = bricks.map((x) => (x.uid === s.moving!.uid ? cand.brick : x));
        return { ...s, history: pushHistory(s.history, next), moving: null, active: null, selected: cand.brick.uid, message: null };
      }
      if (!canTake(s.inventory, bricks, s.active.partId, s.active.colorId)) return msg(s, "None of those left in this set.");
      const next = [...bricks, cand.brick];
      const stillHave = canTake(s.inventory, next, s.active.partId, s.active.colorId);
      return { ...s, history: pushHistory(s.history, next), active: stillHave ? s.active : null, message: null };
    }
    case "DROP": {
      if (s.moving) return msg(s, "Place or cancel the brick you are moving first.");
      if (!canTake(s.inventory, bricks, a.partId, a.colorId)) return msg(s, "None of those left in this set.");
      const withPart = { ...s, active: { partId: a.partId, colorId: a.colorId, rot: s.active?.rot ?? 0 } as ActivePart, selected: null };
      return studioReducer(withPart, { type: "PLACE", anchor: a.anchor });
    }
    case "SELECT":
      if (s.moving) return s;
      return { ...s, selected: a.uid, active: null, message: null };
    case "DELETE": {
      if (!s.selected) return s;
      if (wouldStrand(bricks, s.selected)) return msg(s, "Other bricks rest on this one — remove those first.");
      return { ...s, history: pushHistory(s.history, bricks.filter((b) => b.uid !== s.selected)), selected: null, message: null };
    }
    case "DUPLICATE": {
      const b = bricks.find((x) => x.uid === s.selected);
      if (!b) return s;
      if (!canTake(s.inventory, bricks, b.partId, b.colorId)) return msg(s, "No more of this piece in the set.");
      // Put the copy on top of the original — always a valid stud connection if there's room.
      const tops = columnTops(bricks);
      const y = Math.max(...cellsOf(b).map((c) => tops.get(`${c.x},${c.z}`) ?? 0));
      const use = checkPlacement(bricks, { ...b, uid: newUid(), y }, s.bounds);
      if (!use.valid) return msg(s, use.reason ?? "No room for a copy.");
      return { ...s, history: pushHistory(s.history, [...bricks, use.brick]), selected: use.brick.uid, message: null };
    }
    case "MOVE": {
      const b = bricks.find((x) => x.uid === s.selected);
      if (!b) return s;
      if (wouldStrand(bricks, b.uid)) return msg(s, "Other bricks rest on this one — move those first.");
      return { ...s, moving: b, active: { partId: b.partId, colorId: b.colorId, rot: b.rot }, selected: null, message: "Moving — click to set it down, Esc to cancel." };
    }
    case "CANCEL":
      if (s.moving) return { ...s, selected: s.moving.uid, moving: null, active: null, message: null };
      return { ...s, active: null, selected: null, message: null };
    case "UNDO":
      if (s.moving) return s;
      return { ...s, history: undo(s.history), selected: null, message: null };
    case "REDO":
      if (s.moving) return s;
      return { ...s, history: redo(s.history), selected: null, message: null };
    case "CLEAR":
      if (!bricks.length) return s;
      return { ...s, history: pushHistory(s.history, []), selected: null, moving: null, active: null, message: null };
    case "LOAD":
      return { ...s, history: createHistory(a.bricks), selected: null, moving: null, active: null, message: null };
    case "DISMISS_MESSAGE":
      return { ...s, message: null };
  }
}
