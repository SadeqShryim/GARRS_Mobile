# Task 3 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-3-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 3: Splash fixtures and timeline maths

**Files:**
- Create: `src/fixtures/splash.ts`, `src/screens/splash/timeline.ts`, `src/screens/splash/__tests__/timeline.test.ts`

**Interfaces:**
- Produces: `TILES` (5 `require`d JPEGs), `HERO`, `HERO_SIZE`, `GLYPHS`, `COPY`; `T`, `ACCEL`, `RUN_END`, `MQ`, `DUR`, `wrapWidth/Height`, `tile(k)`, `rowTiles(r)`, `speedAt`, `advance`, `blurAt`, `scaleAt`, `rowOffset`, `coverRect`, `colorMatrix`. Functions marked `'worklet'` are called from the UI thread in Tasks 8–9.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/timeline.test.ts`

```ts
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
    expect(rowOffset(100, 5)).toBeCloseTo(130 - 1274);
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
```

- [ ] **Step 2: Run** `npm test -- timeline` → FAIL (modules missing).

- [ ] **Step 3: Write `src/fixtures/splash.ts`**

```ts
// Verbatim from design/Splash.dc.html — the script constants (TILES, GLYPHS) and every copy string in the template.
export const TILES = [
  require('../assets/images/tile-1.jpg'),
  require('../assets/images/tile-2.jpg'),
  require('../assets/images/tile-3.jpg'),
  require('../assets/images/tile-4.jpg'),
  require('../assets/images/tile-5.jpg'),
] as const;
export const HERO = require('../assets/images/crash-hero.jpg');
export const HERO_SIZE = { width: 720, height: 1542 } as const;

export const GLYPHS: readonly (readonly [string, string])[] = [
  ['alarm-warning-fill', '#D0021B'], ['oil-fill', '#D0021B'],
  ['temp-hot-fill', '#E8A317'], ['battery-2-charge-fill', '#D0021B'],
  ['steering-2-fill', '#E8A317'], ['shield-flash-fill', '#D0021B'],
  ['error-warning-fill', '#E8A317'], ['drop-fill', '#E8A317'],
  ['car-fill', '#D0021B'], ['disc-line', '#E8A317'],
  ['fire-fill', '#D0021B'], ['lightbulb-flash-fill', '#E8A317'],
];

export const COPY = {
  mark: 'RECALL HUB',
  replay: 'REPLAY',
  bubble: 'Did you f*cking check?',
  brand: 'Recall Hub',
  // Source: 'Get started with Recall Hub' with text-wrap: balance — breaks after "started" at 430 (splash-geometry.json).
  emailTitle: 'Get started\nwith Recall Hub',
  continueWith: 'Continue with',
  google: 'Google',
  apple: 'Apple',
  or: 'OR',
  emailPlaceholder: 'Email',
  pwTitle: 'Create your password',
  pwSub: 'At least 6 characters. ',
  pwPlaceholder: 'Password',
  cfTitle: 'One last step',
  cfSub: 'Confirm your password to continue',
  cfPlaceholder: 'Confirm password',
  error: 'Passwords do not match.',
  back: 'Go back',
  footer: 'Already have an account? ',
  signIn: 'Sign in',
} as const;
```

- [ ] **Step 4: Write `src/screens/splash/timeline.ts`**

```ts
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
```

- [ ] **Step 5: Run** `npm test -- timeline && npm run typecheck` → PASS.

- [ ] **Step 6: Checkpoint** — "feat: splash fixtures and timeline maths (verbatim from the source)"

