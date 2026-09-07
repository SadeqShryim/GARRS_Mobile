### Task 8: Rail geometry and tripled-list index math

**Files:**
- Create: `src/lib/rail.ts`
- Test: `src/lib/__tests__/rail.test.ts`

**Interfaces:**
- Produces: `CARD_W = 318`, `GAP = 14`, `STEP = 332`, `railPadding(width)`, `slotForOffset(x)`, `liveIndex(slot, n)`, `middleSlot(i, n)`, `recenterSlot(slot, n)`. Slots index the tripled list (`0 … 3n−1`); the middle copy is `n … 2n−1`.

- [ ] **Step 1: Write the failing test**

```ts
import { liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../rail';

describe('rail math', () => {
  it('centres a 318 card on any width', () => {
    expect(railPadding(430)).toBe(56);
    expect(railPadding(412)).toBe(47);
  });
  it('snaps offsets to slots', () => {
    expect(STEP).toBe(332);
    expect(slotForOffset(0)).toBe(0);
    expect(slotForOffset(340)).toBe(1);
    expect(slotForOffset(3 * 332 + 100)).toBe(3);
  });
  it('maps slots to live vehicle indices', () => {
    expect(liveIndex(4, 3)).toBe(1);
    expect(liveIndex(8, 3)).toBe(2);
    expect(middleSlot(0, 3)).toBe(3);
    expect(middleSlot(2, 3)).toBe(5);
  });
  it('recentres into the middle copy', () => {
    expect(recenterSlot(0, 3)).toBe(3);
    expect(recenterSlot(2, 3)).toBe(5);
    expect(recenterSlot(4, 3)).toBe(4);
    expect(recenterSlot(6, 3)).toBe(3);
    expect(recenterSlot(8, 3)).toBe(5);
  });
});
```

- [ ] **Step 2: Run** `npm test -- rail` → FAIL.

- [ ] **Step 3: Write `src/lib/rail.ts`**

```ts
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
```

- [ ] **Step 4: Run** `npm test -- rail` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: rail geometry and infinite-rail index math"

---

