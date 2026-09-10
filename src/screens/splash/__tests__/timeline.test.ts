import { GLYPHS, TILES } from '../../../fixtures/splash';
import { ACCEL, DUR, MQ, RUN_END, T, advance, blurAt, colorMatrix, coverRect, rowOffset, rowTiles, scaleAt, speedAt, tile, wrapHeight, wrapWidth } from '../timeline';

describe('schedule and geometry constants', () => {
  it('match the source', () => {
    expect(T).toEqual({ photo: 3000, bubble: 3500, fade: 6550, auth: 7100 });
    expect(ACCEL).toBe(3);
    expect(RUN_END).toBeCloseTo(3.15);
    expect(MQ.step).toBe(182);
    expect(MQ.half).toBe(1274);
    expect(MQ.rowStep).toBe(126);
    expect(wrapHeight()).toBe(742);
    expect(wrapWidth(430, 932)).toBeCloseTo(2236.8);
    expect(wrapWidth(915, 412)).toBeCloseTo(2196);
    expect(DUR.blobDrift).toEqual([20000, 25000, 26000, 22000]);
    expect(GLYPHS).toHaveLength(12);
    expect(TILES).toHaveLength(5);
  });
});

describe('tile(k)', () => {
  it('interleaves telltales at k % 3 === 1 with alternating bases and cycling glyphs', () => {
    expect(tile(0)).toEqual({ base: '#0E0E12', photo: 0 });
    expect(tile(1)).toEqual({ base: '#111116', glyph: 'oil-fill', tone: '#D0021B' });
    expect(tile(2)).toEqual({ base: '#0E0E12', photo: 2 });
    expect(tile(4)).toEqual({ base: '#0C0C10', glyph: 'steering-2-fill', tone: '#E8A317' });
    expect(tile(7)).toEqual({ base: '#111116', glyph: 'drop-fill', tone: '#E8A317' });
    expect(tile(5)).toEqual({ base: '#0E0E12', photo: 0 });
    expect(tile(13).glyph).toBe(GLYPHS[1][0]);
    expect(tile(22)).toEqual({ base: '#0C0C10', glyph: 'fire-fill', tone: '#D0021B' });
  });
  it('builds rows of 7 tiles (k = r*4 + i) duplicated once', () => {
    const r2 = rowTiles(2);
    expect(r2).toHaveLength(14);
    expect(r2.slice(0, 7)).toEqual(r2.slice(7));
    expect(r2[0]).toEqual(tile(8));
    expect(r2[6]).toEqual(tile(14));
    expect(rowTiles(0)[0]).toEqual(tile(0));
  });
});

describe('kinematics', () => {
  it('accelerates from 55 to 3255 px/s over 3 s', () => {
    expect(speedAt(0)).toBe(55);
    expect(speedAt(ACCEL)).toBeCloseTo(3255);
    expect(speedAt(10)).toBeCloseTo(3255);
    expect(speedAt(1.5)).toBeCloseTo(55 + 3200 * Math.pow(0.5, 2.8));
  });
  it('clamps dt to 50 ms', () => {
    expect(advance(0, 0, 0.016)).toBeCloseTo(55 * 0.016);
    expect(advance(10, 0, 0.5)).toBeCloseTo(10 + 55 * 0.05);
  });
  it('ramps blur from 1.5 s to 16 px at 3 s and drops values below .25', () => {
    expect(blurAt(0)).toBe(0);
    expect(blurAt(1.5)).toBe(0);
    expect(blurAt(1.8)).toBe(0);
    expect(blurAt(2.25)).toBeCloseTo(2);
    expect(blurAt(3)).toBeCloseTo(16);
    expect(blurAt(3.15)).toBeCloseTo(16 * 1.1 ** 3);
  });
  it('zooms 1 → 1.16 with p²', () => {
    expect(scaleAt(0)).toBe(1);
    expect(scaleAt(1.5)).toBeCloseTo(1.04);
    expect(scaleAt(3)).toBeCloseTo(1.16);
    expect(scaleAt(5)).toBeCloseTo(1.16);
  });
  it('offsets rows by their speed factor, alternating direction, modulo 1274', () => {
    expect(rowOffset(100, 0)).toBeCloseTo(-80);
    expect(rowOffset(100, 1)).toBeCloseTo(90 - 1274);
    expect(rowOffset(2000, 0)).toBeCloseTo(-((2000 * 0.8) % 1274));
    expect(rowOffset(0, 1)).toBe(-1274);
    expect(rowOffset(0, 0)).toBe(-0);
  });
});

describe('coverRect', () => {
  it('covers the frame and positions 50% 40%', () => {
    const r = coverRect(430, 932, 720, 1542);
    expect(r.height).toBeCloseTo(932);
    expect(r.width).toBeCloseTo((720 * 932) / 1542);
    expect(r.x).toBeCloseTo((430 - r.width) / 2);
    expect(r.y).toBeCloseTo(0);
    const wide = coverRect(1000, 500, 720, 1542);
    expect(wide.width).toBeCloseTo(1000);
    expect(wide.x).toBeCloseTo(0);
    expect(wide.y).toBeCloseTo((500 - wide.height) * 0.4);
  });
});

describe('colorMatrix', () => {
  it('is brightness on the diagonal when saturation is 1, and the luminance matrix when it is 0', () => {
    expect(colorMatrix(0.6, 1)).toEqual([0.6, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 1, 0]);
    const g = colorMatrix(1, 0);
    expect(g.slice(0, 3)).toEqual([0.213, 0.715, 0.072]);
    expect(g.slice(5, 8)).toEqual([0.213, 0.715, 0.072]);
    expect(g[18]).toBe(1);
  });
});
