// Constants and pure maths of design/Splash.dc.html's `run()` / `tick` — nothing here touches React or Skia.
import { GLYPHS, TILES } from '../../fixtures/splash';

// Schedule: T_PHOTO, T_BUBBLE, T_AUTH; the bubble fade starts 550 ms before auth.
export const T = { photo: 3000, bubble: 3500, fade: 7100 - 550, auth: 7100 } as const;
export const ACCEL = 3.0;               // seconds of accelerating marquee
export const RUN_END = ACCEL + 0.15;    // the rAF loop stops here

// Marquee geometry: tiles 168×112 r12, gap 14 (TILE_W = 182), 6 rows of 7 tiles duplicated, wrap 240vmax rotated −25°.
export const MQ = {
  tileW: 168, tileH: 112, gap: 14, step: 182, rowStep: 126, rows: 6, perRow: 7, half: 7 * 182,
  rotateDeg: -25, vmax: 2.4, radius: 12, glyphSize: 40,
  shadow: { dy: 18, sigma: 20, alpha: 0.55 },   // box-shadow: 0 18px 40px rgba(0,0,0,.55) → σ = 40 / 2
} as const;
export const wrapHeight = () => MQ.rows * MQ.tileH + (MQ.rows - 1) * MQ.gap;   // 742
export const wrapWidth = (w: number, h: number) => MQ.vmax * Math.max(w, h);   // 240vmax

// Every CSS transition / animation duration in the artboard (ms).
export const DUR = {
  stage: 300, mark: 450, photo: 320, photoScale: 1600, photoFx: 650, veil: 400, blob: 900,
  bubbleOut: 550, bubblePop: 620, auth: 800, stepIn: 500,
  blobDrift: [20000, 25000, 26000, 22000],
} as const;

export type Tile = { base: string; photo?: number; glyph?: string; tone?: string };

// design: tile(k)
export function tile(k: number): Tile {
  if (k % 3 === 1) {
    const g = GLYPHS[k % GLYPHS.length];
    return { base: k % 2 ? '#111116' : '#0C0C10', glyph: g[0], tone: g[1] };
  }
  return { base: '#0E0E12', photo: k % TILES.length };
}

// design: constructor — row r holds tiles k = r*4 + i for i in 0..6, then the same seven again.
export function rowTiles(r: number): Tile[] {
  const base: Tile[] = [];
  for (let i = 0; i < MQ.perRow; i++) base.push(tile(r * 4 + i));
  return base.concat(base);
}

// design: tick
export function speedAt(t: number): number {
  'worklet';
  const p = Math.min(1, t / ACCEL);
  return 55 + 3200 * Math.pow(p, 2.8);
}
export function advance(dist: number, t: number, dtRaw: number): number {
  'worklet';
  const dt = Math.min(0.05, dtRaw);
  return dist + speedAt(t) * dt;
}
export function blurAt(t: number): number {
  'worklet';
  const b = 16 * Math.pow(Math.max(0, (t - 1.5) / (ACCEL - 1.5)), 3);
  return b > 0.25 ? b : 0;
}
export function scaleAt(t: number): number {
  'worklet';
  const p = Math.min(1, t / ACCEL);
  return 1 + 0.16 * p * p;
}
export function rowOffset(dist: number, i: number): number {
  'worklet';
  const off = (dist * (0.8 + 0.1 * i)) % 1274;
  return i % 2 ? off - 1274 : -off;
}

// background-size: cover; background-position: px py (fractions)
export function coverRect(w: number, h: number, iw: number, ih: number, px = 0.5, py = 0.4) {
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  return { x: (w - dw) * px, y: (h - dh) * py, width: dw, height: dh };
}

// CSS brightness(b) × saturate(s) as a Skia 4×5 colour matrix (row-major, translate column 0).
export function colorMatrix(b: number, s: number): number[] {
  'worklet';
  const r = 0.213, g = 0.715, bl = 0.072;
  return [
    b * (r + (1 - r) * s), b * (g - g * s), b * (bl - bl * s), 0, 0,
    b * (r - r * s), b * (g + (1 - g) * s), b * (bl - bl * s), 0, 0,
    b * (r - r * s), b * (g - g * s), b * (bl + (1 - bl) * s), 0, 0,
    0, 0, 0, 1, 0,
  ];
}
