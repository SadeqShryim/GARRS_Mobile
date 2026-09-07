import { cssAngleToPoints } from '../gradient';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('cssAngleToPoints', () => {
  it('180deg is top to bottom', () => {
    const { start, end } = cssAngleToPoints(180, 100, 50);
    expect(close(start.x, 0.5) && close(start.y, 0) && close(end.x, 0.5) && close(end.y, 1)).toBe(true);
  });
  it('90deg is left to right', () => {
    const { start, end } = cssAngleToPoints(90, 100, 50);
    expect(close(start.x, 0) && close(start.y, 0.5) && close(end.x, 1) && close(end.y, 0.5)).toBe(true);
  });
  it('160deg on a 132x44 box extends past the box like CSS does', () => {
    const { start, end } = cssAngleToPoints(160, 132, 44);
    expect(start.y).toBeLessThan(0);
    expect(end.y).toBeGreaterThan(1);
    expect(end.x).toBeGreaterThan(start.x);
  });
});
