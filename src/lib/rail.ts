export const CARD_W = 318;
export const GAP = 14;
export const STEP = CARD_W + GAP;

export const railPadding = (width: number) => (width - CARD_W) / 2;
export const slotForOffset = (x: number) => Math.round(x / STEP);
export const liveIndex = (slot: number, n: number) => ((slot % n) + n) % n;
export const middleSlot = (i: number, n: number) => n + i;
export function recenterSlot(slot: number, n: number) {
  if (slot < n) return slot + n;
  if (slot >= 2 * n) return slot - n;
  return slot;
}
