/**
 * Inventory system. Remaining quantities are *derived* from the set's part list minus the
 * bricks currently in the assembly, so undo/redo can never desynchronise them.
 */
import type { BrickInstance } from "./assembly";

export interface InventoryLine {
  partId: string;
  colorId: string;
  qty: number;
}

export const invKey = (partId: string, colorId: string) => `${partId}|${colorId}`;

export function usedCounts(bricks: BrickInstance[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of bricks) {
    const k = invKey(b.partId, b.colorId);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function remainingCounts(inventory: InventoryLine[], bricks: BrickInstance[]): Map<string, number> {
  const used = usedCounts(bricks);
  const m = new Map<string, number>();
  for (const line of inventory) {
    const k = invKey(line.partId, line.colorId);
    m.set(k, (m.get(k) ?? 0) + line.qty - (used.get(k) ?? 0));
    used.delete(k);
  }
  // Anything used but not in the inventory is an over-use (shown as negative).
  for (const [k, n] of used) m.set(k, (m.get(k) ?? 0) - n);
  return m;
}

export function canTake(inventory: InventoryLine[], bricks: BrickInstance[], partId: string, colorId: string): boolean {
  return (remainingCounts(inventory, bricks).get(invKey(partId, colorId)) ?? 0) > 0;
}

/** Inventory implied by a list of bricks (e.g. an instruction's full model). */
export function inventoryFromBricks(bricks: BrickInstance[]): InventoryLine[] {
  const m = usedCounts(bricks);
  return [...m.entries()].map(([k, qty]) => {
    const [partId, colorId] = k.split("|");
    return { partId, colorId, qty };
  });
}

export function totalPieces(inventory: InventoryLine[]): number {
  return inventory.reduce((s, l) => s + l.qty, 0);
}
