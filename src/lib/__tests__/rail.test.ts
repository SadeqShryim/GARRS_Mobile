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
