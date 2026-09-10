# Slice 2 — Real Splash Implementation Plan

> **For agentic workers:** subagent-driven, one fresh implementer per task, no reviewer dispatches (user ruling from Slice 1). Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch from the extracted `task-N-brief.md`, never by pasting this file.

**Goal:** Replace the Slice 1 splash stub with the real `Splash.dc.html` artboard — accelerating motion-blurred marquee → crash-photo cut → liquid-glass bubble → three-step auth over drifting blobs — pixel-faithfully, in Expo Go on the S24 Ultra, keeping the stub's `onDone → dismissSplash()` contract.

**Architecture:** one Skia `<Canvas>` (marquee with a shared-value blur layer, vignette, photo with live blur/colour-matrix, veil, the bubble's backdrop filter) under plain RN views (mark, blobs, bubble face, auth panel, REPLAY). A phase state machine driven by `setTimeout` mirrors the source's `run()`; every CSS transition is a `withTiming` retargeting from the current value; the marquee is driven by `useFrameCallback` entirely on the UI thread. Pure maths (tile kinds, kinematics, blur/scale ramps, cover rect, colour matrix) and the auth step reducer are separate, unit-tested modules.

**Tech stack additions:** `@shopify/react-native-skia@2.6.2` (Expo Go bundled, installed), `@expo-google-fonts/instrument-serif` (installed). Everything else is Slice 1's stack.

**Spec:** `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` — every measurement in this plan comes from it; the spec cites `design_handoff_recall_hub/design/Splash.dc.html` and `docs/reference/splash-geometry.json`, which win over both documents.

## Global Constraints

- **Fidelity first.** Values are the design's, in dp, unscaled. Never "improve" spacing, copy, colours, timing, or easing. Where a platform cannot match, match intent and record the gap in `docs/reference/verification.md` (Task 11).
- **Copy is verbatim** from `src/fixtures/splash.ts` — never retype a string in a component; import `COPY`.
- **Target device:** Samsung S24 Ultra (Android 14+, ~412 dp, 120 Hz). Emulator proxy: AVD `s24ultraProxy` (Pixel 8, x86_64 API 35). Layout derives from `useWindowDimensions()`, never from 430 × 932.
- **Fonts:** Geist 300/400/500/600, Geist Mono 400/500, Instrument Serif 400. Every `Text` goes through `Sans` / `Mono` / `Serif` (`allowFontScaling={false}`, `includeFontPadding: false`).
- **Icons:** Remixicon 4.5.0 by name without the `ri-` prefix. Never substitute another icon set.
- **Overlays** render in `OverlayHost` as absolute siblings of the navigator. Never RN `<Modal>`.
- **Skia:** all Skia nodes live inside the single `Stage` canvas. Animated Skia props are Reanimated shared/derived values (never React state per frame). The blur layer is the *inner* group of the transform group.
- **Reanimated:** `withTiming` for every CSS transition (`bez(ease.css)` for `ease`, `bez(ease.standard)` for `cubic-bezier(.2,.8,.2,1)`, `bez(ease.bubble)` for the pop, `bez(ease.inOut)` for the blob drifts). Keyframe animations use `withSequence`.
- **Tests:** jest-expo + RNTL. Skia is mocked in `jest.setup.ts` (Task 1); the marquee drive hook has a manual mock (Task 8). The gate after every task is `npm test && npm run typecheck`, re-run by the controller.
- **Git:** allowed. Implementers do **not** run git (tasks run in parallel); the controller commits after verifying each task with the checkpoint message.
- **Package manager:** npm. Both new packages are already installed — no `npm install` in any task.
- **No downloads** beyond what is already on the machine.

## File map

```
src/screens/splash/Splash.tsx              composition, timeline, REPLAY, StatusBar light          (Task 10)
src/screens/splash/timeline.ts             constants + pure maths                                    (Task 3)
src/screens/splash/auth.ts                 auth step logic                                           (Task 4)
src/screens/splash/useSplashTimeline.ts    phase machine → shared values                            (Task 8)
src/screens/splash/useMarqueeDrive.ts      useFrameCallback → dist/t/sigma/scale                    (Task 8)
src/screens/splash/__mocks__/useMarqueeDrive.ts   manual mock for tests                            (Task 8)
src/screens/splash/Stage.tsx               Skia canvas: Marquee, Vignette, Photo, Veil, BubbleBackdrop (Task 9)
src/screens/splash/Marquee.tsx             Skia marquee nodes + glyphPlacement                      (Task 9)
src/screens/splash/Mark.tsx                RN logo mark                                              (Task 7)
src/screens/splash/Blobs.tsx               RN baked blobs + scrim                                    (Task 7)
src/screens/splash/Bubble.tsx              RN bubble face + useBubbleValues/startPop                 (Task 7)
src/screens/splash/AuthPanel.tsx           RN auth UI + StepIn                                       (Task 6)
src/screens/splash/GlassPill.tsx, GlassField.tsx, GoogleMark.tsx, ReplayPill.tsx                    (Task 5)
src/fixtures/splash.ts                     TILES, HERO, GLYPHS, COPY                                 (Task 3)
src/theme/tokens.ts (+), src/ui/Txt.tsx (+Serif), app/_layout.tsx (+font), jest.setup.ts (+mock)  (Task 1)
scripts/bake-assets.mjs (+blobs) → src/assets/images/blob-1..4.png                                  (Task 2)
src/assets/images/tile-1..5.jpg, crash-hero.jpg   already copied verbatim                            (Task 2 verifies)
src/overlays/OverlayHost.tsx               Splash replaces SplashStub; SplashStub + test deleted      (Task 10)
docs/reference/emu-splash-*.png, verification.md (append)                                            (Task 11)
```

## Dependency order

- Tasks 1, 2, 3, 4 are pairwise disjoint → run in parallel.
- Tasks 5 and 7 need 1 and 3; Task 8 needs 3 and 7 (`BubbleValues`) → 5 ∥ 7, then 8.
- Task 6 needs 4 and 5; Task 9 needs 1, 3, 7, 8 → 6 ∥ 9.
- Task 10 needs everything; Task 11 is the controller's emulator pass; Task 12 the phone.

---

### Task 1: Skia jest mock, Instrument Serif, splash tokens

**Files:**
- Modify: `jest.setup.ts` (append), `src/theme/tokens.ts` (replace three objects), `src/ui/Txt.tsx` (add `Serif`), `app/_layout.tsx` (load the font)
- Create: `src/__tests__/skia-mock.test.tsx`, `src/ui/__tests__/Serif.test.tsx`

**Interfaces:**
- Produces: a jest environment where `@shopify/react-native-skia` renders as `View`s (default `testID` = `skia-<ComponentName>`), `useImage`/`useFont` return `null`, and `Skia.Paint/ImageFilter/ColorFilter/Path/XYWHRect/RRectXY` return inert objects; `Serif` text component; `color.tileA/tileB/tilePhoto/markInk/authBlueInk/authError/warning`; `font.serif400`; `ease.css/inOut/bubble`. Every later task relies on these names.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/Serif.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Serif } from '../Txt';

it('Serif uses Instrument Serif for every weight and disables font scaling', () => {
  const { getByText } = render(<Serif size={52} lh={52} ls={-1} weight={600} color="#FFFFFF">One last step</Serif>);
  const el = getByText('One last step');
  expect(el.props.allowFontScaling).toBe(false);
  expect(el.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'InstrumentSerif_400Regular', fontSize: 52, lineHeight: 52, letterSpacing: -1, color: '#FFFFFF' })]));
});
```

`src/__tests__/skia-mock.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Canvas, Group, Image as SkImage, Skia, TileMode, useFont, useImage } from '@shopify/react-native-skia';

function Probe() {
  const img = useImage(1);
  const font = useFont(1, 40);
  return (
    <Canvas testID="canvas" style={{ width: 10, height: 10 }}>
      <Group>
        <SkImage image={img} x={0} y={0} width={1} height={1} fit="cover" />
      </Group>
      {font ? null : null}
    </Canvas>
  );
}

it('renders Skia components through the jest mock and exposes inert factories', () => {
  const { getByTestId } = render(<Probe />);
  expect(getByTestId('canvas')).toBeTruthy();
  expect(getByTestId('skia-Group')).toBeTruthy();
  expect(Skia.RRectXY(Skia.XYWHRect(0, 0, 1, 1), 2, 2)).toEqual({ rect: { x: 0, y: 0, width: 1, height: 1 }, rx: 2, ry: 2 });
  expect(TileMode.Decal).toBe(3);
  const p = Skia.Paint();
  p.setAlphaf(0.5);
  expect(Skia.ImageFilter.MakeBlur(1, 1, TileMode.Clamp, null)).toEqual({});
  const path = Skia.Path.Make();
  path.moveTo(1, 2);
  expect(path.moveTo).toHaveBeenCalledWith(1, 2);
});
```

- [ ] **Step 2: Run** `npm test -- Serif skia-mock` → FAIL (no `Serif`; Skia not mocked / native module missing).

- [ ] **Step 3: Append the Skia mock to `jest.setup.ts`**

```ts
// Slice 2: @shopify/react-native-skia — components render as Views (testID `skia-<Name>` unless given), hooks return null,
// Skia.* factories return inert objects so derived values can run in JS. Nothing here draws.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  const node = (name: string) => {
    const C = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => React.createElement(View, { testID: testID ?? `skia-${name}` }, children);
    C.displayName = name;
    return C;
  };
  const inert = () => ({});
  const path = () => {
    const p: Record<string, jest.Mock> = {};
    for (const m of ['moveTo', 'lineTo', 'arcToTangent', 'close', 'addRRect']) p[m] = jest.fn(() => p);
    return p;
  };
  const XYWHRect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
  const RRectXY = (rect: unknown, rx: number, ry: number) => ({ rect, rx, ry });
  const Skia = {
    Paint: () => ({ setImageFilter: jest.fn(), setAlphaf: jest.fn(), setColor: jest.fn() }),
    ImageFilter: { MakeBlur: inert, MakeColorFilter: inert },
    ColorFilter: { MakeMatrix: inert },
    Path: { Make: path },
    XYWHRect,
    RRectXY,
    Point: (x: number, y: number) => ({ x, y }),
  };
  const named: Record<string, unknown> = {
    __esModule: true,
    Skia,
    TileMode: { Clamp: 0, Repeat: 1, Mirror: 2, Decal: 3 },
    useImage: () => null,
    useFont: () => null,
    useTypeface: () => null,
    useCanvasRef: () => ({ current: null }),
    vec: (x = 0, y = 0) => ({ x, y }),
    rect: XYWHRect,
    rrect: RRectXY,
  };
  return new Proxy(named, { get: (t, key) => (key in t ? t[key as string] : typeof key === 'string' ? node(key) : undefined) });
});
```

- [ ] **Step 4: Replace the `color`, `font` and `ease` objects in `src/theme/tokens.ts`** (keep `bez`, `dur`, `blur`, `layout` as they are)

```ts
export const color = {
  blue: '#0CB8E9', blueDeep: '#0F638F', blueInk: '#0B4E73',
  red: '#D0021B', amber: '#c98a1f', amberBright: '#ffb741', teal: '#01a08c',
  ink: '#17161A', ink2: '#3a3941', ink3: '#57565e', ink4: '#63626a', ink5: '#6b6a72', ink7: '#9a99a2',
  bar: '#17181A', surface: '#FFFFFF', sunken: '#F2F1EE', sunken2: '#EDECE8', input: '#F7F6F4',
  disabled: '#E7E6E3', disabledInk: '#9a99a2', handle: '#dcdbd8', shellDark: '#232228', splash: '#08080A',
  textOnDark: '#F4F3F5',
  hair: 'rgba(0,0,0,0.09)', hair08: 'rgba(0,0,0,0.08)', hair07: 'rgba(0,0,0,0.07)', hair13: 'rgba(0,0,0,0.13)',
  hair14: 'rgba(0,0,0,0.14)', tint02: 'rgba(0,0,0,0.02)', tint05: 'rgba(0,0,0,0.05)',
  scrim: 'rgba(23,22,26,0.28)',
  // Slice 2 — Splash.dc.html
  tileA: '#111116', tileB: '#0C0C10', tilePhoto: '#0E0E12', markInk: '#08222E', authBlueInk: '#04222C', authError: '#FF8A94', warning: '#E8A317',
} as const;

export const font = {
  sans300: 'Geist_300Light', sans400: 'Geist_400Regular', sans500: 'Geist_500Medium', sans600: 'Geist_600SemiBold',
  mono400: 'GeistMono_400Regular', mono500: 'GeistMono_500Medium',
  serif400: 'InstrumentSerif_400Regular',
} as const;

export const ease = {
  standard: [0.2, 0.8, 0.2, 1], hump: [0.2, 0.9, 0.2, 1], sheet: [0.2, 0.85, 0.2, 1],
  gauge: [0.43, 0.13, 0.23, 0.96], press: [0.4, 0, 0.2, 1], cssEaseOut: [0, 0, 0.58, 1],
  // Slice 2 — CSS `ease`, `ease-in-out`, and the bubble pop's cubic-bezier(.2,.9,.25,1)
  css: [0.25, 0.1, 0.25, 1], inOut: [0.42, 0, 0.58, 1], bubble: [0.2, 0.9, 0.25, 1],
} as const;
```

- [ ] **Step 5: Add `Serif` to `src/ui/Txt.tsx`** (whole file)

```tsx
import { Text, type TextProps } from 'react-native';
import { color as C, font } from '../theme/tokens';

export type TxtProps = TextProps & { size: number; lh?: number; ls?: number; color?: string; weight?: 300 | 400 | 500 | 600; center?: boolean };
type Faces = Record<300 | 400 | 500 | 600, string>;
const SANS: Faces = { 300: font.sans300, 400: font.sans400, 500: font.sans500, 600: font.sans600 };
const MONO: Faces = { 300: font.mono400, 400: font.mono400, 500: font.mono500, 600: font.mono500 };
const SERIF: Faces = { 300: font.serif400, 400: font.serif400, 500: font.serif400, 600: font.serif400 };

function make(faces: Faces) {
  return function Txt({ size, lh, ls, color = C.ink, weight = 400, center, style, ...rest }: TxtProps) {
    return (
      <Text
        allowFontScaling={false}
        {...rest}
        style={[{ fontFamily: faces[weight], fontSize: size, lineHeight: lh, letterSpacing: ls, color, includeFontPadding: false, textAlign: center ? 'center' : undefined }, style]}
      />
    );
  };
}
export const Sans = make(SANS);
export const Mono = make(MONO);
export const Serif = make(SERIF);
```

- [ ] **Step 6: Load Instrument Serif in `app/_layout.tsx`**

Add the import `import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';` and add `InstrumentSerif_400Regular,` to the `useFonts({ … })` object (after `GeistMono_500Medium`). Nothing else changes.

- [ ] **Step 7: Run** `npm test && npm run typecheck` → all PASS (the two new suites plus the Slice 1 suites).

- [ ] **Step 8: Checkpoint** — "chore: skia jest mock, Instrument Serif, splash tokens"

---

### Task 2: Bake the auth blobs; verify the copied photo assets

**Files:**
- Modify: `scripts/bake-assets.mjs` (append)
- Create: `src/assets/images/blob-1.png … blob-4.png` (generated), `src/assets/__tests__/splash-assets.test.ts`
- Already present (copied verbatim by the controller, do not modify): `src/assets/images/tile-1.jpg … tile-5.jpg`, `src/assets/images/crash-hero.jpg`

**Interfaces:**
- Produces: `blob-N.png` = the design's blob `N` (box `w × h`) rendered with a 180 px bleed on every side, i.e. `(w + 360) × (h + 360)` RGBA at 1×. `Blobs.tsx` (Task 7) draws each at `(left − 180, top − 180)`.

- [ ] **Step 1: Write the failing test** `src/assets/__tests__/splash-assets.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const IMG = resolve(__dirname, '..', 'images');
function png(file: string) {
  const b = readFileSync(resolve(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

describe('splash assets', () => {
  it.each([
    ['blob-1.png', 780, 660],
    ['blob-2.png', 700, 660],
    ['blob-3.png', 660, 640],
    ['blob-4.png', 660, 600],
  ])('%s is baked at box + 2×180 bleed (%i×%i RGBA)', (f, w, h) => {
    expect(png(f)).toEqual({ w, h, colorType: 6 });
  });
  it.each(['tile-1.jpg', 'tile-2.jpg', 'tile-3.jpg', 'tile-4.jpg', 'tile-5.jpg', 'crash-hero.jpg'])('%s is the design JPEG, copied verbatim', (f) => {
    const b = readFileSync(resolve(IMG, f));
    expect(b[0]).toBe(0xff);
    expect(b[1]).toBe(0xd8);
    expect(b.length).toBeGreaterThan(10000);
  });
});
```

- [ ] **Step 2: Run** `npm test -- splash-assets` → FAIL (no blob PNGs).

- [ ] **Step 3: Append the blob bake to `scripts/bake-assets.mjs`** (after the existing glow-blob block, reusing its `blur`, `PNG`, `OUT`, `writeFileSync`)

```js
// --- Slice 2: auth blobs (Splash.dc.html, the blobOp layer) ---
// Each blob is a w×h box filled with radial-gradient(circle, rgba(c,a0) 0%, rgba(c,0) 70%) — `circle` = farthest-corner
// radius — clipped to an ellipse (border-radius: 50%), then filter: blur(sigma). Baked at 1× with a 180 px bleed (≥ 3σ).
const BLOB_BLEED = 180;
const AUTH_BLOBS = [
  { name: 'blob-1', w: 420, h: 300, sigma: 58, rgb: [201, 138, 58], a0: 0.85 },
  { name: 'blob-2', w: 340, h: 300, sigma: 54, rgb: [109, 74, 224], a0: 0.8 },
  { name: 'blob-3', w: 300, h: 280, sigma: 60, rgb: [142, 27, 42], a0: 0.8 },
  { name: 'blob-4', w: 300, h: 240, sigma: 56, rgb: [27, 110, 150], a0: 0.75 },
];
function authBlob({ w, h, rgb, a0 }) {
  const W = w + 2 * BLOB_BLEED;
  const H = h + 2 * BLOB_BLEED;
  const png = new PNG({ width: W, height: H });
  const cx = W / 2, cy = H / 2, rx = w / 2, ry = h / 2;
  const R = Math.hypot(rx, ry) * 0.7;                      // the gradient reaches 0 at 70% of the farthest-corner radius
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const e = Math.hypot(dx / rx, dy / ry);               // 1 on the ellipse edge
      const cover = Math.max(0, Math.min(1, (1 - e) * Math.min(rx, ry) + 0.5));   // ~1 px anti-aliased ellipse edge
      const d = Math.hypot(dx, dy);
      const a = d < R ? a0 * (1 - d / R) : 0;
      const o = (y * W + x) * 4;
      png.data[o] = rgb[0]; png.data[o + 1] = rgb[1]; png.data[o + 2] = rgb[2];
      png.data[o + 3] = Math.round(a * cover * 255);
    }
  }
  return png;
}
for (const b of AUTH_BLOBS) {
  const png = authBlob(b);
  blur(png, b.sigma);
  writeFileSync(`${OUT}/${b.name}.png`, PNG.sync.write(png));
  console.log(`${b.name}.png ${png.width}x${png.height}`);
}
```

- [ ] **Step 4: Bake** — `npm run bake-assets` (re-bakes the Slice 1 assets too; takes ~30 s). Expected: four `blob-N.png` lines with the sizes in the test.

- [ ] **Step 5: Look at one** — Read `src/assets/images/blob-1.png`: a soft warm-orange oval fading to transparent, no hard edge, nothing clipped at the borders.

- [ ] **Step 6: Run** `npm test -- assets && npm run typecheck` → PASS (the Slice 1 `assets.test.ts` must still pass — the re-bake is deterministic).

- [ ] **Step 7: Checkpoint** — "chore: bake the auth blobs; ship the splash JPEGs"

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

---

### Task 4: Auth step logic

**Files:**
- Create: `src/screens/splash/auth.ts`, `src/screens/splash/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `AuthState`, `AuthAction`, `initialAuth()`, `emailOk`, `next(s) → { state, done }`, `back(s)`, `reduce(s, a)`, `emailArrow/pwArrow/cfArrow(s)`. `AuthPanel` (Task 6) is a thin view over these.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/auth.test.ts`

```ts
import { back, cfArrow, emailArrow, emailOk, initialAuth, next, pwArrow, reduce, type AuthState } from '../auth';

const at = (patch: Partial<AuthState>): AuthState => ({ ...initialAuth(), ...patch });

describe('emailOk', () => {
  it('is the source regex /\\S+@\\S+\\.\\S+/', () => {
    expect(emailOk('sam@recallhub.app')).toBe(true);
    expect(emailOk('sam@recallhub')).toBe(false);
    expect(emailOk('a@b.c')).toBe(true);
    expect(emailOk('')).toBe(false);
  });
});

describe('next', () => {
  it('leaves the email step only with a valid address', () => {
    expect(next(at({ email: 'nope' })).state.step).toBe('email');
    expect(next(at({ email: 'sam@recallhub.app' })).state.step).toBe('pw');
  });
  it('needs 6 characters to reach confirm and clears err on the way', () => {
    expect(next(at({ step: 'pw', pw: 'hunt', err: true })).state).toEqual(at({ step: 'pw', pw: 'hunt', err: true }));
    expect(next(at({ step: 'pw', pw: 'hunter22', err: true })).state).toEqual(at({ step: 'confirm', pw: 'hunter22', err: false }));
  });
  it('finishes only when the confirmation matches, otherwise flags err', () => {
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunt' }))).toEqual({ state: at({ step: 'confirm', pw: 'hunter22', cf: 'hunt' }), done: false });
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunter2x' }))).toEqual({ state: at({ step: 'confirm', pw: 'hunter22', cf: 'hunter2x', err: true }), done: false });
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunter22' })).done).toBe(true);
  });
});

describe('back', () => {
  it('drops the confirmation and the error, then the password step, then stops', () => {
    expect(back(at({ step: 'confirm', pw: 'hunter22', cf: 'x', err: true }))).toEqual(at({ step: 'pw', pw: 'hunter22' }));
    expect(back(at({ step: 'pw', pw: 'hunter22' }))).toEqual(at({ step: 'email', pw: 'hunter22' }));
    expect(back(at({}))).toEqual(at({}));
  });
});

describe('reduce', () => {
  it('edits fields; typing a confirmation clears err; eye toggles; reset restores the initial state', () => {
    let s = reduce(initialAuth(), { type: 'email', value: 'sam@recallhub.app' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'pw', value: 'hunter22' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'cf', value: 'hunter2x' });
    s = reduce(s, { type: 'next' });
    expect(s.err).toBe(true);
    s = reduce(s, { type: 'cf', value: 'hunter2' });
    expect(s.err).toBe(false);
    expect(reduce(s, { type: 'toggleEye' }).eye).toBe(true);
    expect(reduce(s, { type: 'back' }).step).toBe('pw');
    expect(reduce(s, { type: 'reset' })).toEqual(initialAuth());
  });
});

describe('arrows', () => {
  it('follow the source visibility rules', () => {
    expect(emailArrow(at({ email: 'sam@recallhub.app' }))).toBe(true);
    expect(emailArrow(at({ step: 'pw', email: 'sam@recallhub.app' }))).toBe(false);
    expect(pwArrow(at({ step: 'pw', pw: 'hunte' }))).toBe(false);
    expect(pwArrow(at({ step: 'pw', pw: 'hunter' }))).toBe(true);
    expect(cfArrow(at({ step: 'confirm', cf: 'hunter22' }))).toBe(true);
    expect(cfArrow(at({ step: 'confirm', cf: 'hunt' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npm test -- auth` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/auth.ts`**

```ts
// design/Splash.dc.html — the logic class's next() / back() / renderVals() for the auth steps, as pure functions.
export type Step = 'email' | 'pw' | 'confirm';
export type AuthState = { step: Step; email: string; pw: string; cf: string; eye: boolean; err: boolean };
export type AuthAction =
  | { type: 'email'; value: string }
  | { type: 'pw'; value: string }
  | { type: 'cf'; value: string }
  | { type: 'toggleEye' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' };
export type AuthStep = { state: AuthState; done: boolean };

export const initialAuth = (): AuthState => ({ step: 'email', email: '', pw: '', cf: '', eye: false, err: false });
export const emailOk = (email: string) => /\S+@\S+\.\S+/.test(email);

// design: next()
export function next(s: AuthState): AuthStep {
  if (s.step === 'email') return { state: emailOk(s.email) ? { ...s, step: 'pw' } : s, done: false };
  if (s.step === 'pw') return { state: s.pw.length >= 6 ? { ...s, step: 'confirm', err: false } : s, done: false };
  if (s.cf.length < 6) return { state: s, done: false };
  return s.cf === s.pw ? { state: s, done: true } : { state: { ...s, err: true }, done: false };
}

// design: back()
export function back(s: AuthState): AuthState {
  if (s.step === 'confirm') return { ...s, step: 'pw', cf: '', err: false };
  if (s.step === 'pw') return { ...s, step: 'email' };
  return s;
}

export function reduce(s: AuthState, a: AuthAction): AuthState {
  switch (a.type) {
    case 'email': return { ...s, email: a.value };
    case 'pw': return { ...s, pw: a.value };
    case 'cf': return { ...s, cf: a.value, err: false };
    case 'toggleEye': return { ...s, eye: !s.eye };
    case 'next': return next(s).state;
    case 'back': return back(s);
    case 'reset': return initialAuth();
  }
}

// design: emailArrow / pwArrow / cfArrow
export const emailArrow = (s: AuthState) => s.step === 'email' && emailOk(s.email);
export const pwArrow = (s: AuthState) => s.pw.length >= 6;
export const cfArrow = (s: AuthState) => s.cf.length >= 6;
```

- [ ] **Step 4: Run** `npm test -- auth && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: splash auth step logic"

---

### Task 5: Glass pill, glass field, Google mark, REPLAY pill

**Files:**
- Create: `src/screens/splash/GlassPill.tsx`, `src/screens/splash/GlassField.tsx`, `src/screens/splash/GoogleMark.tsx`, `src/screens/splash/ReplayPill.tsx`, `src/screens/splash/__tests__/glass.test.tsx`

**Interfaces:**
- Produces: `GlassPill({ label, icon, onPress })`; `GlassField({ leading, paddingLeft: 16 | 12, value, onChangeText, placeholder, secure?, email?, onSubmit, arrow, arrowLabel: 'Continue' | 'Finish', testID? })`; `GoogleMark({ size = 19 })`; `ReplayPill({ onPress })`. Consumed by Tasks 6 and 10.
- Consumes: `cssAngleToPoints` (Slice 1), `Icon`, `Sans`, `Mono`, `COPY`, `font`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/glass.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassField } from '../GlassField';
import { GlassPill } from '../GlassPill';
import { GoogleMark } from '../GoogleMark';
import { ReplayPill } from '../ReplayPill';

describe('GlassPill', () => {
  it('shows the label with its icon and presses', () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = render(<GlassPill label="Google" icon={<Text>G</Text>} onPress={onPress} />);
    expect(getByText('G')).toBeTruthy();
    fireEvent.press(getByLabelText('Google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('GlassField', () => {
  const base = { leading: <Text>icon</Text>, paddingLeft: 16 as const, placeholder: 'Email', onChangeText: jest.fn(), value: '', onSubmit: jest.fn(), arrowLabel: 'Continue' as const };
  it('hides the arrow until told, submits from the arrow and from the keyboard', () => {
    const onSubmit = jest.fn();
    const { queryByLabelText, getByLabelText, getByPlaceholderText, rerender } = render(<GlassField {...base} onSubmit={onSubmit} arrow={false} />);
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent(getByPlaceholderText('Email'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<GlassField {...base} onSubmit={onSubmit} arrow />);
    fireEvent.press(getByLabelText('Continue'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
  it('is a secure, non-capitalising input when asked', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} placeholder="Password" secure arrow={false} />);
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.placeholderTextColor).toBe('rgba(255,255,255,0.45)');
  });
  it('uses the email keyboard for the email field', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} email arrow={false} />);
    expect(getByPlaceholderText('Email').props.keyboardType).toBe('email-address');
  });
});

it('GoogleMark renders the four-colour G', () => {
  const { toJSON } = render(<GoogleMark />);
  expect(JSON.stringify(toJSON())).toContain('#4285F4');
});

it('ReplayPill shows REPLAY with the restart icon and presses', () => {
  const onPress = jest.fn();
  const { getByText, getByTestId } = render(<ReplayPill onPress={onPress} />);
  expect(getByTestId('icon-restart-line')).toBeTruthy();
  fireEvent.press(getByText('REPLAY'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run** `npm test -- glass` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/GlassPill.tsx`**

```tsx
// Splash.dc.html — the Google / Apple pills: h42, padding 0 18, r999, gap 8, glass fill, hover scale(.98) → pressed.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cssAngleToPoints } from '../../lib/gradient';
import { dur } from '../../theme/tokens';
import { Sans } from '../../ui/Txt';

const FILL = ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.30), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 18px rgba(0,0,0,0.4)';

export function GlassPill({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const [box, setBox] = useState({ w: 110, h: 42 });
  const press = useSharedValue(0);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * press.value }] }));
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <Animated.View style={scale}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => { press.value = withTiming(1, { duration: dur.press }); }}
        onPressOut={() => { press.value = withTiming(0, { duration: dur.press }); }}
        onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={styles.pill}
      >
        <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        {icon}
        <Sans size={14} weight={600} color="#FFFFFF">{label}</Sans>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
});
```

- [ ] **Step 4: Write `src/screens/splash/GlassField.tsx`**

```tsx
// Splash.dc.html — the email / password / confirm fields: h52, r999, gap 8, padding 0 6 0 (16 | 12), glass fill,
// a 40×40 glass arrow on the right when the step's condition holds.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { cssAngleToPoints } from '../../lib/gradient';
import { font } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';

const FILL = ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)'] as const;
const ARROW_FILL = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1.5px 1px rgba(255,255,255,0.26), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.13), 0 10px 24px rgba(0,0,0,0.4)';
const ARROW_SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.18)';
const ARROW_PTS = cssAngleToPoints(-72, 40, 40);

export type GlassFieldProps = {
  leading: ReactNode;
  paddingLeft: 16 | 12;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  email?: boolean;
  onSubmit: () => void;
  arrow: boolean;
  arrowLabel: 'Continue' | 'Finish';
  testID?: string;
};

export function GlassField({ leading, paddingLeft, value, onChangeText, placeholder, secure, email, onSubmit, arrow, arrowLabel, testID }: GlassFieldProps) {
  const [box, setBox] = useState({ w: 320, h: 52 });
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[styles.field, { paddingLeft }]}>
      <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
      {leading}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={arrowLabel === 'Finish' ? 'done' : 'next'}
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
        allowFontScaling={false}
        style={styles.input}
      />
      {arrow && (
        <Pressable accessibilityRole="button" accessibilityLabel={arrowLabel} onPress={onSubmit} style={styles.arrow}>
          <LinearGradient colors={ARROW_FILL} locations={STOPS} start={ARROW_PTS.start} end={ARROW_PTS.end} style={StyleSheet.absoluteFill} />
          <Icon name="arrow-right-line" size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingRight: 6, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: font.sans400, fontSize: 15, color: '#FFFFFF', padding: 0, includeFontPadding: false },
  arrow: { width: 40, height: 40, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: ARROW_SHADOW },
});
```

- [ ] **Step 5: Write `src/screens/splash/GoogleMark.tsx`**

```tsx
// Splash.dc.html — the inline Google "G" (paths verbatim), 19 × 19 in the pill.
import Svg, { G, Path } from 'react-native-svg';

export function GoogleMark({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(3,2)">
        <Path fill="#4285F4" d="M57.81 30.15c0-2.43-.2-4.2-.62-6.03H29.5v10.95h16.25c-.33 2.72-2.1 6.81-6.03 9.56l-.06.37 8.76 6.78.6.06c5.58-5.15 8.79-12.72 8.79-21.69" />
        <Path fill="#34A853" d="M29.5 58.99c7.96 0 14.65-2.62 19.53-7.14l-9.31-7.21c-2.49 1.74-5.83 2.95-10.22 2.95-7.8 0-14.42-5.15-16.78-12.26l-.35.03-9.1 7.05-.12.33c4.85 9.63 14.81 16.25 26.35 16.25" />
        <Path fill="#FBBC05" d="M12.72 35.33a17.9 17.9 0 0 1-.99-5.83c0-2.03.36-4 .95-5.84l-.02-.39-9.22-7.16-.3.14A29.4 29.4 0 0 0 0 29.5c0 4.75 1.15 9.24 3.15 13.24l9.57-7.41" />
        <Path fill="#EB4335" d="M29.5 11.41c5.53 0 9.27 2.39 11.4 4.39l8.32-8.13C44.11 2.92 37.46 0 29.5 0 17.96 0 8 6.62 3.15 16.26l9.54 7.4C15.08 16.55 21.7 11.41 29.5 11.41" />
      </G>
    </Svg>
  );
}
```

- [ ] **Step 6: Write `src/screens/splash/ReplayPill.tsx`**

```tsx
// Splash.dc.html — REPLAY: top 14 right 14, h28 + 1px border (30 total), padding 0 11, r999, white .10 fill, white .16 border,
// restart-line 12 + mono 9 / 1.4, both white .8. z-index 6 (above everything). Its backdrop blur(6px) is omitted (spec §9).
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../fixtures/splash';
import { Icon } from '../../ui/Icon';
import { Mono } from '../../ui/Txt';

export function ReplayPill({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Replay" onPress={onPress} style={[styles.pill, { top: 14 + insets.top }]}>
      <Icon name="restart-line" size={12} color="rgba(255,255,255,0.8)" />
      <Mono size={9} ls={1.4} color="rgba(255,255,255,0.8)">{COPY.replay}</Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', right: 14, zIndex: 6, flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 11,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
});
```

- [ ] **Step 7: Run** `npm test -- glass && npm run typecheck` → PASS. If `submitBehavior` is rejected by the installed RN types, use `blurOnSubmit={false}` instead and note it in the report.

- [ ] **Step 8: Checkpoint** — "feat: splash glass pill/field, Google mark, REPLAY pill"

---

### Task 6: Auth panel

**Files:**
- Create: `src/screens/splash/AuthPanel.tsx`, `src/screens/splash/__tests__/AuthPanel.test.tsx`

**Interfaces:**
- Produces: `AuthPanel({ opacity: SharedValue<number>, active: boolean, runId: number, onDone })` — the whole auth layer (header, step blocks with the `sp-in` entrance, fields, error, Go back, footer), `testID="auth"`, pointer events only while `active`, state reset when `runId` changes, Android back → previous step while active.
- Consumes: Task 4 (`auth.ts`), Task 5 (glass primitives), `COPY`, `Serif`, `color`, `ease`, `DUR.stepIn`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/AuthPanel.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { BackHandler } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { AuthPanel } from '../AuthPanel';

function Host({ onDone, active = true, runId = 0 }: { onDone: () => void; active?: boolean; runId?: number }) {
  const opacity = useSharedValue(1);
  return <AuthPanel opacity={opacity} active={active} runId={runId} onDone={onDone} />;
}
const setup = (props: Partial<ComponentProps<typeof Host>> = {}) => {
  const onDone = jest.fn();
  return { onDone, ...render(<Host onDone={onDone} {...props} />) };
};

describe('AuthPanel', () => {
  it('shows the email step and gates its arrow on a valid address', () => {
    const { getByText, queryByLabelText, getByTestId, getByLabelText, queryByText } = setup();
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    expect(getByText('Continue with')).toBeTruthy();
    expect(getByText('OR')).toBeTruthy();
    expect(queryByText('Go back')).toBeNull();
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(getByText('At least 6 characters. sam@recallhub.app')).toBeTruthy();
    expect(getByTestId('email')).toBeTruthy();   // the email field stays on the password step
    expect(getByText('Go back')).toBeTruthy();
  });

  it('walks password → confirm, flags a mismatch, finishes on a match', () => {
    const { getByTestId, getByLabelText, queryByLabelText, getByText, queryByText, onDone } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunt');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('One last step')).toBeTruthy();
    expect(getByText('Confirm your password to continue')).toBeTruthy();
    fireEvent.changeText(getByTestId('confirm'), 'hunter2x');
    fireEvent.press(getByLabelText('Finish'));
    expect(getByText('Passwords do not match.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.changeText(getByTestId('confirm'), 'hunter22');
    expect(queryByText('Passwords do not match.')).toBeNull();
    fireEvent.press(getByLabelText('Finish'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes back a step, clearing the confirmation', () => {
    const { getByTestId, getByText, queryByTestId } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent(getByTestId('password'), 'submitEditing');
    fireEvent.changeText(getByTestId('confirm'), 'hun');
    fireEvent.press(getByText('Go back'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(queryByTestId('confirm')).toBeNull();
    fireEvent.press(getByText('Go back'));
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
  });

  it('toggles the eye on the password field', () => {
    const { getByTestId, getByLabelText } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(getByTestId('password').props.secureTextEntry).toBe(true);
    expect(getByTestId('icon-eye-line')).toBeTruthy();
    fireEvent.press(getByLabelText('Show password'));
    expect(getByTestId('password').props.secureTextEntry).toBe(false);
    expect(getByTestId('icon-eye-off-line')).toBeTruthy();
  });

  it('Google, Apple and Sign in all finish', () => {
    const { getByLabelText, getByText, onDone } = setup();
    fireEvent.press(getByLabelText('Google'));
    fireEvent.press(getByLabelText('Apple'));
    fireEvent.press(getByText('Sign in'));
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it('is inert until active and resets on a new run', () => {
    const { getByTestId, rerender, onDone } = setup({ active: false });
    expect(getByTestId('auth').props.pointerEvents).toBe('none');
    rerender(<Host onDone={onDone} active runId={0} />);
    expect(getByTestId('auth').props.pointerEvents).toBe('auto');
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    rerender(<Host onDone={onDone} active runId={1} />);
    expect(getByTestId('email').props.value).toBe('');
  });

  it('hardware back steps backwards while a later step is showing', () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => { handlers.push(h as () => boolean); return { remove: jest.fn() }; });
    const { getByTestId, getByText } = setup();
    expect(handlers).toHaveLength(0);
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(handlers.length).toBeGreaterThan(0);
    expect(handlers[handlers.length - 1]()).toBe(true);
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run** `npm test -- AuthPanel` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/AuthPanel.tsx`**

```tsx
// Splash.dc.html — the `authOp` layer: header, the three step blocks (each entering with `sp-in`), the field column, the footer.
import { type ReactNode, useEffect, useReducer } from 'react';
import { BackHandler, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../fixtures/splash';
import { bez, color, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Sans, Serif } from '../../ui/Txt';
import { cfArrow, emailArrow, initialAuth, next, pwArrow, reduce } from './auth';
import { GlassField } from './GlassField';
import { GlassPill } from './GlassPill';
import { GoogleMark } from './GoogleMark';
import { DUR } from './timeline';

export type AuthPanelProps = { opacity: SharedValue<number>; active: boolean; runId: number; onDone: () => void };

export function AuthPanel({ opacity, active, runId, onDone }: AuthPanelProps) {
  const insets = useSafeAreaInsets();
  const [s, dispatch] = useReducer(reduce, undefined, initialAuth);
  useEffect(() => { dispatch({ type: 'reset' }); }, [runId]);
  const go = () => {
    if (next(s).done) onDone();
    else dispatch({ type: 'next' });
  };
  // Android back steps backwards through the auth steps instead of leaving the app; the email step is not handled.
  useEffect(() => {
    if (!active || s.step === 'email') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { dispatch({ type: 'back' }); return true; });
    return () => sub.remove();
  }, [active, s.step]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const eye = (
    <Pressable accessibilityRole="button" accessibilityLabel="Show password" onPress={() => dispatch({ type: 'toggleEye' })} style={styles.eye}>
      <Icon name={s.eye ? 'eye-off-line' : 'eye-line'} size={18} color="rgba(255,255,255,0.72)" />
    </Pressable>
  );
  return (
    <Animated.View testID="auth" pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, fade]}>
      <View style={[styles.header, { paddingTop: 22 + insets.top }]}>
        <View style={styles.brandTile}>
          <Icon name="shield-check-fill" size={15} color={color.authBlueInk} />
        </View>
        <Sans size={15} weight={600} ls={-0.2} color="#FFFFFF">{COPY.brand}</Sans>
      </View>

      <View style={styles.middle}>
        {s.step === 'email' && (
          <StepIn key={`email-${runId}`} style={styles.emailBlock}>
            <Serif size={52} lh={52} ls={-1} color="#FFFFFF" center>{COPY.emailTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.62)">{COPY.continueWith}</Sans>
            <View style={styles.pills}>
              <GlassPill label={COPY.google} icon={<GoogleMark />} onPress={onDone} />
              <GlassPill label={COPY.apple} icon={<Icon name="apple-fill" size={19} color="#FFFFFF" />} onPress={onDone} />
            </View>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Sans size={11} weight={600} ls={0.4} color="rgba(255,255,255,0.5)">{COPY.or}</Sans>
              <View style={styles.orLine} />
            </View>
          </StepIn>
        )}
        {s.step === 'pw' && (
          <StepIn key={`pw-${runId}`} style={styles.stepBlock}>
            <Serif size={46} lh={48} color="#FFFFFF" center>{COPY.pwTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.6)" center>{COPY.pwSub + s.email}</Sans>
          </StepIn>
        )}
        {s.step === 'confirm' && (
          <StepIn key={`confirm-${runId}`} style={styles.stepBlock}>
            <Serif size={46} lh={48} color="#FFFFFF" center>{COPY.cfTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.6)" center>{COPY.cfSub}</Sans>
          </StepIn>
        )}

        <View style={styles.fields}>
          {(s.step === 'email' || s.step === 'pw') && (
            <GlassField
              testID="email" paddingLeft={16} leading={<Icon name="mail-line" size={18} color="rgba(255,255,255,0.72)" />}
              value={s.email} onChangeText={(value) => dispatch({ type: 'email', value })} placeholder={COPY.emailPlaceholder} email
              onSubmit={go} arrow={emailArrow(s)} arrowLabel="Continue"
            />
          )}
          {s.step === 'pw' && (
            <GlassField
              testID="password" paddingLeft={12} leading={eye}
              value={s.pw} onChangeText={(value) => dispatch({ type: 'pw', value })} placeholder={COPY.pwPlaceholder} secure={!s.eye}
              onSubmit={go} arrow={pwArrow(s)} arrowLabel="Continue"
            />
          )}
          {s.step === 'confirm' && (
            <GlassField
              testID="confirm" paddingLeft={12} leading={eye}
              value={s.cf} onChangeText={(value) => dispatch({ type: 'cf', value })} placeholder={COPY.cfPlaceholder} secure={!s.eye}
              onSubmit={go} arrow={cfArrow(s)} arrowLabel="Finish"
            />
          )}
          {s.err && <Sans size={12.5} color={color.authError} center>{COPY.error}</Sans>}
          {s.step !== 'email' && (
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => dispatch({ type: 'back' })} style={styles.back}>
              <Icon name="arrow-left-line" size={14} color="rgba(255,255,255,0.6)" />
              <Sans size={13} color="rgba(255,255,255,0.6)">{COPY.back}</Sans>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: 30 + insets.bottom }]}>
        <Sans size={13} color="rgba(255,255,255,0.55)">
          {COPY.footer}
          <Sans size={13} weight={500} color="#FFFFFF" accessibilityRole="link" onPress={onDone}>{COPY.signIn}</Sans>
        </Sans>
      </View>
    </Animated.View>
  );
}

// @keyframes sp-in: from { opacity 0; translateY 10px; blur 6px } to { 1; 0; 0 } — .5 s ease, on mount, per step.
function StepIn({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: DUR.stepIn, easing: bez(ease.css) }); }, [p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: 10 * (1 - p.value) }], filter: [{ blur: 6 * (1 - p.value) }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brandTile: { width: 26, height: 26, borderRadius: 8, backgroundColor: color.blue, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 24, paddingBottom: 40 },
  emailBlock: { alignItems: 'center', gap: 16, width: '100%' },
  stepBlock: { alignItems: 'center', gap: 10, width: '100%' },
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', paddingVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  fields: { gap: 14, width: '100%', maxWidth: 320 },
  eye: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footer: { alignItems: 'center', paddingHorizontal: 24 },
});
```

- [ ] **Step 4: Run** `npm test -- AuthPanel && npm run typecheck` → PASS. If TypeScript rejects `filter` inside the animated style, type the returned object as `ViewStyle` (`useAnimatedStyle<ViewStyle>`); do not drop the blur.

- [ ] **Step 5: Checkpoint** — "feat: splash auth panel (email → password → confirm) with the sp-in entrance"

---

### Task 7: Mark, Blobs, Bubble (RN layers)

**Files:**
- Create: `src/screens/splash/Mark.tsx`, `src/screens/splash/Blobs.tsx`, `src/screens/splash/Bubble.tsx`, `src/screens/splash/__tests__/layers.test.tsx`

**Interfaces:**
- Produces: `Mark({ opacity })`; `Blobs({ opacity })`; `Bubble({ v })` plus `useBubbleValues(): BubbleValues`, `startPop(v)`, `fadeOutBubble(v)`, type `BubbleValues = { frame, pop, ty, scale, opacity }` (all shared values). Task 8's timeline calls `fadeOutBubble`; Task 9's backdrop reads `frame/pop/ty/scale/opacity`.
- Consumes: `COPY`, `color`, `ease`, `DUR`, `cssAngleToPoints`, `Icon`, `Mono`, `Sans`, `blob-N.png` (Task 2).

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/layers.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Blobs } from '../Blobs';
import { Bubble, useBubbleValues, type BubbleValues } from '../Bubble';
import { Mark } from '../Mark';

function One({ children }: { children: (op: SharedValue<number>) => ReactElement }) {
  const op = useSharedValue(1);
  return children(op);
}

it('Mark shows the shield tile and RECALL HUB', () => {
  const { getByText, getByTestId } = render(<One>{(op) => <Mark opacity={op} />}</One>);
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByTestId('icon-shield-check-fill')).toBeTruthy();
});

it('Blobs draws four blobs under the scrim', () => {
  const { getByTestId } = render(<One>{(op) => <Blobs opacity={op} />}</One>);
  for (const i of [1, 2, 3, 4]) expect(getByTestId(`blob-${i}`)).toBeTruthy();
  expect(getByTestId('blob-scrim')).toBeTruthy();
});

describe('Bubble', () => {
  let captured: BubbleValues | null = null;
  function Host() {
    const v = useBubbleValues();
    captured = v;
    return <Bubble v={v} />;
  }
  it('shows the copy and reports its frame for the Skia backdrop', () => {
    const { getByText, getByTestId } = render(<Host />);
    expect(getByText('Did you f*cking check?')).toBeTruthy();
    fireEvent(getByTestId('bubble-face'), 'layout', { nativeEvent: { layout: { x: 35, y: 425, width: 360, height: 82 } } });
    expect(captured!.frame.value).toEqual({ x: 35, y: 425, w: 360, h: 82 });
  });
});
```

- [ ] **Step 2: Run** `npm test -- layers` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/Mark.tsx`**

```tsx
// Splash.dc.html — the centred logo mark inside the stage: 54×54 r16 tile, 150deg 5-stop gradient, shield-check-fill 27 #08222E,
// box-shadow 0 14px 34px rgba(0,0,0,.6); caption RECALL HUB mono 10 / 2.8 white .6, gap 14. Opacity = stage × mark (Splash.tsx).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { COPY } from '../../fixtures/splash';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono } from '../../ui/Txt';

const PTS = cssAngleToPoints(150, 54, 54);

export function Mark({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" testID="mark" style={[StyleSheet.absoluteFill, styles.wrap, style]}>
      <View style={styles.tile}>
        <LinearGradient colors={['#F4FBFF', '#A7DAFF', '#1B6E96', '#0E5378', '#8ACEFF']} locations={[0, 0.2, 0.54, 0.76, 1]} start={PTS.start} end={PTS.end} style={StyleSheet.absoluteFill} />
        <Icon name="shield-check-fill" size={27} color={color.markInk} />
      </View>
      <Mono size={10} ls={2.8} color="rgba(255,255,255,0.6)">{COPY.mark}</Mono>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  tile: { width: 54, height: 54, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 34px rgba(0,0,0,0.6)' },
});
```

- [ ] **Step 4: Write `src/screens/splash/Blobs.tsx`**

```tsx
// Splash.dc.html — the `blobOp` layer: four blurred radial blobs drifting on sp-blob1 / sp-blob2, under rgba(8,8,10,.42).
// The blur is baked into blob-N.png with a 180 px bleed (scripts/bake-assets.mjs); positions are the CSS offsets resolved
// against the window; the drift transforms about each box's centre (CSS transform-origin default).
import { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { bez, ease } from '../../theme/tokens';
import { DUR } from './timeline';

const BLEED = 180;
type Spec = { src: number; w: number; h: number; left?: number; right?: number; top?: number; bottom?: number; drift: 1 | 2; period: number };
const BLOBS: Spec[] = [
  { src: require('../../assets/images/blob-1.png'), w: 420, h: 300, left: -120, bottom: 120, drift: 1, period: DUR.blobDrift[0] },
  { src: require('../../assets/images/blob-2.png'), w: 340, h: 300, right: -100, top: 60, drift: 2, period: DUR.blobDrift[1] },
  { src: require('../../assets/images/blob-3.png'), w: 300, h: 280, right: -70, bottom: 60, drift: 1, period: DUR.blobDrift[2] },
  { src: require('../../assets/images/blob-4.png'), w: 300, h: 240, left: 40, top: -60, drift: 2, period: DUR.blobDrift[3] },
];
// sp-blob1: 50% translate(-26px,22px) scale(1.08); sp-blob2: 50% translate(24px,-20px) scale(1.06); ease-in-out per keyframe, infinite.
const DRIFT = { 1: { x: -26, y: 22, s: 1.08 }, 2: { x: 24, y: -20, s: 1.06 } } as const;

export function Blobs({ opacity }: { opacity: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" testID="blobs" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}>
      {BLOBS.map((spec, i) => <Blob key={i} index={i + 1} spec={spec} width={width} height={height} />)}
      <View testID="blob-scrim" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.42)' }]} />
    </Animated.View>
  );
}

function Blob({ index, spec, width, height }: { index: number; spec: Spec; width: number; height: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const half = { duration: spec.period / 2, easing: bez(ease.inOut) };
    p.value = withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1, false);
  }, [p, spec.period]);
  const d = DRIFT[spec.drift];
  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: d.x * p.value }, { translateY: d.y * p.value }, { scale: 1 + (d.s - 1) * p.value }],
  }));
  const left = spec.left !== undefined ? spec.left : width - (spec.right ?? 0) - spec.w;
  const top = spec.top !== undefined ? spec.top : height - (spec.bottom ?? 0) - spec.h;
  return (
    <Animated.View testID={`blob-${index}`} style={[{ position: 'absolute', left, top, width: spec.w, height: spec.h }, a]}>
      <Image source={spec.src} style={{ position: 'absolute', left: -BLEED, top: -BLEED, width: spec.w + 2 * BLEED, height: spec.h + 2 * BLEED }} />
    </Animated.View>
  );
}
```

- [ ] **Step 5: Write `src/screens/splash/Bubble.tsx`**

```tsx
// Splash.dc.html — the liquid-glass speech bubble: wrapper centred with 26 px side padding; face max-width 322 + padding 24/28,
// r28 with a 9 px bottom-left corner, −72deg glass gradient, three inset shadows + 0 24px 60px outer, a blurred highlight
// ellipse, the copy at 29/34/600/−.7 with a 0 2px 10px text shadow. Pop = @keyframes sp-bub (.62 s, cubic-bezier(.2,.9,.25,1)).
// The backdrop blur/saturate is drawn by Stage.tsx's BubbleBackdrop from the same shared values.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COPY } from '../../fixtures/splash';
import { cssAngleToPoints } from '../../lib/gradient';
import { bez, ease } from '../../theme/tokens';
import { Sans } from '../../ui/Txt';
import { DUR } from './timeline';

export type BubbleFrame = { x: number; y: number; w: number; h: number };
export type BubbleValues = {
  frame: SharedValue<BubbleFrame>;   // the face's layout frame in window coordinates (no transform)
  pop: SharedValue<number>;          // sp-bub opacity 0 → 1
  ty: SharedValue<number>;           // sp-bub translateY 20 → 0
  scale: SharedValue<number>;        // sp-bub scale .84 → 1.05 → 1
  opacity: SharedValue<number>;      // the wrapper's opacity (1 while `bubble`, → 0 over .55 s on `fade`)
};

export function useBubbleValues(): BubbleValues {
  return { frame: useSharedValue<BubbleFrame>({ x: 0, y: 0, w: 0, h: 0 }), pop: useSharedValue(0), ty: useSharedValue(20), scale: useSharedValue(0.84), opacity: useSharedValue(1) };
}

// @keyframes sp-bub { 0% { opacity 0; translateY(20px) scale(.84) } 58% { opacity 1; translateY(0) scale(1.05) } 100% { scale(1) } }
export function startPop(v: BubbleValues) {
  const seg1 = { duration: DUR.bubblePop * 0.58, easing: bez(ease.bubble) };
  const seg2 = { duration: DUR.bubblePop * 0.42, easing: bez(ease.bubble) };
  v.opacity.value = 1;
  v.pop.value = 0;
  v.ty.value = 20;
  v.scale.value = 0.84;
  v.pop.value = withTiming(1, seg1);
  v.ty.value = withTiming(0, seg1);
  v.scale.value = withSequence(withTiming(1.05, seg1), withTiming(1, seg2));
}

// bubbleOp: 1 → 0, transition opacity .55s ease (phase `fade`).
export function fadeOutBubble(v: BubbleValues) {
  v.opacity.value = withTiming(0, { duration: DUR.bubbleOut, easing: bez(ease.css) });
}

const FILL = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)'] as const;
const STOPS = [0, 0.45, 1] as const;

export function Bubble({ v }: { v: BubbleValues }) {
  useEffect(() => { startPop(v); }, [v]);
  const wrap = useAnimatedStyle(() => ({ opacity: v.opacity.value }));
  const face = useAnimatedStyle(() => ({ opacity: v.pop.value, transform: [{ translateY: v.ty.value }, { scale: v.scale.value }] }));
  const [box, setBox] = useState({ w: 360, h: 82 });
  const pts = cssAngleToPoints(-72, box.w, box.h);
  const onLayout = (e: LayoutChangeEvent) => {
    const { x, y, width: w, height: h } = e.nativeEvent.layout;
    setBox({ w, h });
    v.frame.value = { x, y, w, h };
  };
  return (
    <Animated.View pointerEvents="none" testID="bubble" style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Animated.View testID="bubble-face" onLayout={onLayout} style={[styles.face, face]}>
        <View style={styles.clip}>
          <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inset]} />
          <View pointerEvents="none" style={styles.highlight}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="hl" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </SvgGradient>
              </Defs>
              <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#hl)" />
            </Svg>
          </View>
          <Sans size={29} lh={34} weight={600} ls={-0.7} color="#FFFFFF" center style={styles.copy}>{COPY.bubble}</Sans>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  face: { maxWidth: 378, borderRadius: 28, borderBottomLeftRadius: 9, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
  clip: { borderRadius: 28, borderBottomLeftRadius: 9, overflow: 'hidden', paddingVertical: 24, paddingHorizontal: 28 },
  inset: { borderRadius: 28, borderBottomLeftRadius: 9, boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.42), inset 0 -2px 2px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.20)' },
  highlight: { position: 'absolute', left: '6%', right: '34%', top: 2, height: '34%', filter: [{ blur: 6 }] },
  copy: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
});
```

- [ ] **Step 6: Run** `npm test -- layers && npm run typecheck` → PASS.

- [ ] **Step 7: Checkpoint** — "feat: splash mark, blobs and glass bubble (RN layers)"

---

### Task 8: Marquee drive and timeline hooks

**Files:**
- Create: `src/screens/splash/useMarqueeDrive.ts`, `src/screens/splash/__mocks__/useMarqueeDrive.ts`, `src/screens/splash/useSplashTimeline.ts`, `src/screens/splash/__tests__/useSplashTimeline.test.tsx`

**Interfaces:**
- Produces: `useMarqueeDrive(runId) → MarqueeValues { t, dist, sigma, scale }` (UI-thread frame loop, restarts on `runId`, stops itself at `RUN_END`); its manual mock (static values) for tests; `useSplashTimeline(bubble) → { phase, runId, run, v: TimelineValues }`; types `Phase`, `TimelineValues`, `MarqueeValues`.
- Consumes: Task 3 maths, Task 7 `BubbleValues` / `fadeOutBubble`, `ease`, `bez`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/useSplashTimeline.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useMarqueeDrive } from '../__mocks__/useMarqueeDrive';
import { useBubbleValues } from '../Bubble';
import { useSplashTimeline } from '../useSplashTimeline';

function Host() {
  const bubble = useBubbleValues();
  const { phase, runId, run } = useSplashTimeline(bubble);
  return (
    <>
      <Text testID="phase">{phase}</Text>
      <Text testID="run">{String(runId)}</Text>
      <Pressable testID="replay" onPress={run} />
    </>
  );
}
const phaseOf = (g: (id: string) => { props: { children: string } }) => g('phase').props.children;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('walks run → photo → bubble → fade → auth on the source schedule', () => {
  const { getByTestId } = render(<Host />);
  expect(phaseOf(getByTestId)).toBe('run');
  expect(getByTestId('run').props.children).toBe('1');
  act(() => { jest.advanceTimersByTime(2999); });
  expect(phaseOf(getByTestId)).toBe('run');
  act(() => { jest.advanceTimersByTime(1); });
  expect(phaseOf(getByTestId)).toBe('photo');
  act(() => { jest.advanceTimersByTime(500); });
  expect(phaseOf(getByTestId)).toBe('bubble');
  act(() => { jest.advanceTimersByTime(3049); });
  expect(phaseOf(getByTestId)).toBe('bubble');
  act(() => { jest.advanceTimersByTime(1); });
  expect(phaseOf(getByTestId)).toBe('fade');
  act(() => { jest.advanceTimersByTime(550); });
  expect(phaseOf(getByTestId)).toBe('auth');
});

it('REPLAY restarts the schedule and bumps runId', () => {
  const { getByTestId } = render(<Host />);
  act(() => { jest.advanceTimersByTime(7100); });
  expect(phaseOf(getByTestId)).toBe('auth');
  fireEvent.press(getByTestId('replay'));
  expect(phaseOf(getByTestId)).toBe('run');
  expect(getByTestId('run').props.children).toBe('2');
  act(() => { jest.advanceTimersByTime(3000); });
  expect(phaseOf(getByTestId)).toBe('photo');
});

it('the marquee drive mock exposes static values', () => {
  function Drive() { const v = useMarqueeDrive(1); return <Text testID="scale">{String(v.scale.value)}</Text>; }
  const { getByTestId } = render(<Drive />);
  expect(getByTestId('scale').props.children).toBe('1');
});
```

- [ ] **Step 2: Run** `npm test -- useSplashTimeline` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/useMarqueeDrive.ts`**

```ts
// design: tick — the rAF loop of run(). Runs on the UI thread from run() until ACCEL + 0.15 s; every consumer is a Skia prop.
import { useCallback, useEffect, useRef } from 'react';
import { runOnJS, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { RUN_END, advance, blurAt, scaleAt } from './timeline';

export type MarqueeValues = { t: SharedValue<number>; dist: SharedValue<number>; sigma: SharedValue<number>; scale: SharedValue<number> };

export function useMarqueeDrive(runId: number): MarqueeValues {
  const t = useSharedValue(0);
  const dist = useSharedValue(0);
  const sigma = useSharedValue(0);
  const scale = useSharedValue(1);
  const start = useSharedValue(-1);
  const last = useSharedValue(-1);
  const frameRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  const stop = useCallback(() => { frameRef.current?.setActive(false); }, []);
  const tick = useCallback((info: { timestamp: number }) => {
    'worklet';
    const now = info.timestamp;
    if (start.value < 0) { start.value = now; last.value = now; }
    const dt = (now - last.value) / 1000;
    last.value = now;
    const tt = (now - start.value) / 1000;
    t.value = tt;
    dist.value = advance(dist.value, tt, dt);
    sigma.value = blurAt(tt);
    scale.value = scaleAt(tt);
    if (tt >= RUN_END) runOnJS(stop)();
  }, [dist, last, scale, sigma, start, stop, t]);
  const frame = useFrameCallback(tick, false);
  frameRef.current = frame;
  useEffect(() => {
    start.value = -1; last.value = -1; t.value = 0; dist.value = 0; sigma.value = 0; scale.value = 1;
    frame.setActive(true);
    return () => frame.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);
  return { t, dist, sigma, scale };
}
```

- [ ] **Step 4: Write the manual mock `src/screens/splash/__mocks__/useMarqueeDrive.ts`**

```ts
// Jest stand-in: no frame loop; static values that Skia mock nodes can read.
import { useSharedValue } from 'react-native-reanimated';
import type { MarqueeValues } from '../useMarqueeDrive';

export function useMarqueeDrive(_runId: number): MarqueeValues {
  return { t: useSharedValue(0), dist: useSharedValue(0), sigma: useSharedValue(0), scale: useSharedValue(1) };
}
```

- [ ] **Step 5: Write `src/screens/splash/useSplashTimeline.ts`**

```ts
// design: run() + renderVals() + the inline `transition:` of every layer. Phases flip on setTimeouts exactly like the source;
// each layer's shared value retargets with withTiming from wherever it is (CSS transition semantics), so REPLAY cross-fades.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { bez, ease } from '../../theme/tokens';
import { fadeOutBubble, type BubbleValues } from './Bubble';
import { DUR, T } from './timeline';

export type Phase = 'run' | 'photo' | 'bubble' | 'fade' | 'auth';
export type TimelineValues = {
  stageOp: SharedValue<number>; markOp: SharedValue<number>; photoOp: SharedValue<number>; photoScale: SharedValue<number>;
  photoFx: SharedValue<number>; veilOp: SharedValue<number>; blobOp: SharedValue<number>; authOp: SharedValue<number>;
};

export function useSplashTimeline(bubble: BubbleValues) {
  const [phase, setPhase] = useState<Phase>('run');
  const [runId, setRunId] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageOp = useSharedValue(1);
  const markOp = useSharedValue(1);
  const photoOp = useSharedValue(0);
  const photoScale = useSharedValue(1.1);
  const photoFx = useSharedValue(0);
  const veilOp = useSharedValue(0);
  const blobOp = useSharedValue(0);
  const authOp = useSharedValue(0);
  const v: TimelineValues = { stageOp, markOp, photoOp, photoScale, photoFx, veilOp, blobOp, authOp };

  // design: run()
  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('run');
    setRunId((r) => r + 1);
    const at = (ms: number, p: Phase) => { timers.current.push(setTimeout(() => setPhase(p), ms)); };
    at(T.photo, 'photo');
    at(T.bubble, 'bubble');
    at(T.fade, 'fade');
    at(T.auth, 'auth');
  }, []);
  useEffect(() => {
    run();
    const pending = timers;
    return () => { pending.current.forEach(clearTimeout); };
  }, [run]);

  // design: renderVals() — stageOp, markOp, photoOp, photoScale, photoFilter, veilOp, blobOp, bubbleOp, authOp.
  useEffect(() => {
    const css = (ms: number) => ({ duration: ms, easing: bez(ease.css) });
    const marquee = phase === 'run';
    const photoUp = phase !== 'run';
    const blurred = phase === 'bubble' || phase === 'fade' || phase === 'auth';
    const authUp = phase === 'auth';
    stageOp.value = withTiming(marquee ? 1 : 0, css(DUR.stage));
    markOp.value = withTiming(marquee ? 1 : 0, css(DUR.mark));
    photoOp.value = withTiming(photoUp ? 1 : 0, css(DUR.photo));
    photoScale.value = withTiming(photoUp ? (blurred ? 1.16 : 1) : 1.1, { duration: DUR.photoScale, easing: bez(ease.standard) });
    photoFx.value = withTiming(blurred ? 1 : 0, css(DUR.photoFx));
    veilOp.value = withTiming(photoUp ? 1 : 0, css(DUR.veil));
    blobOp.value = withTiming(authUp || phase === 'fade' ? 1 : 0, css(DUR.blob));
    authOp.value = withTiming(authUp ? 1 : 0, css(DUR.auth));
    if (phase === 'fade') fadeOutBubble(bubble);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return { phase, runId, run, v };
}
```

- [ ] **Step 6: Run** `npm test -- useSplashTimeline && npm run typecheck` → PASS.

- [ ] **Step 7: Checkpoint** — "feat: splash timeline state machine and UI-thread marquee drive"

---

### Task 9: The Skia stage — marquee, vignette, photo, veil, bubble backdrop

**Files:**
- Create: `src/screens/splash/Marquee.tsx`, `src/screens/splash/Stage.tsx`, `src/screens/splash/__tests__/stage.test.tsx`

**Interfaces:**
- Produces: `Stage({ width, height, marquee, tl, bubble, bubbleMounted })` — the one `<Canvas testID="stage">`; `Marquee` (Skia children) with `glyphPlacement(font, name)`; `bubblePath(x, y, w, h)`.
- Consumes: Task 1 mock/tokens, Task 3 maths + fixtures, Task 7 `BubbleValues`, Task 8 `MarqueeValues`/`TimelineValues`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/stage.test.tsx`

```tsx
import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useBubbleValues } from '../Bubble';
import { glyphPlacement } from '../Marquee';
import { Stage, bubblePath } from '../Stage';

function Host({ mounted }: { mounted: boolean }) {
  const one = useSharedValue(1);
  const zero = useSharedValue(0);
  const bubble = useBubbleValues();
  return (
    <Stage
      width={412} height={915}
      marquee={{ t: zero, dist: zero, sigma: zero, scale: one }}
      tl={{ stageOp: one, markOp: one, photoOp: zero, photoScale: one, photoFx: zero, veilOp: zero, blobOp: zero, authOp: zero }}
      bubble={bubble} bubbleMounted={mounted}
    />
  );
}

it('draws the stage and mounts the bubble backdrop only while the bubble is up', () => {
  const { getByTestId, queryByTestId, rerender } = render(<Host mounted={false} />);
  expect(getByTestId('stage')).toBeTruthy();
  expect(queryByTestId('skia-BackdropFilter')).toBeNull();
  rerender(<Host mounted />);
  expect(getByTestId('skia-BackdropFilter')).toBeTruthy();
});

it('centres a telltale glyph the way flexbox centres its line box', () => {
  const font = { getGlyphIDs: () => [7], getGlyphWidths: () => [30], getMetrics: () => ({ ascent: -36, descent: 8, leading: 0 }) };
  const g = glyphPlacement(font, 'fire-fill');
  expect(g.text).toBe(String.fromCodePoint(60722));
  expect(g.dx).toBe(69);    // (168 − 30) / 2
  expect(g.dy).toBe(70);    // 112 / 2 − (−36 + 8) / 2
});

it('builds the bubble outline with a 9 px bottom-left corner', () => {
  const p = bubblePath(35, 425, 360, 82) as unknown as Record<string, jest.Mock>;
  expect(p.moveTo).toHaveBeenCalledWith(63, 425);
  expect(p.arcToTangent).toHaveBeenCalledTimes(4);
  expect(p.arcToTangent).toHaveBeenNthCalledWith(1, 395, 425, 395, 453, 28);
  expect(p.arcToTangent).toHaveBeenNthCalledWith(3, 35, 507, 35, 498, 9);
  expect(p.close).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run** `npm test -- stage` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/Marquee.tsx`**

```tsx
// Splash.dc.html — the marquee: a 240vmax-wide wrap, top/left 50%, translate(-50%,-50%) rotate(-25deg) scale(1 + .16p²),
// six flex rows (gap 14) of 14 tiles (gap 14), rows translated by rowOffset(); filter: blur(σ) on the wrap.
// CSS applies `filter` before `transform`, so the blur layer is the INNER group: σ then scales with the zoom, as in the source.
import { BlurMask, Group, ImageShader, RoundedRect, Skia, Text as SkText, TileMode, type SkFont, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import glyphMap from '../../assets/remixicon.glyphmap.json';
import { MQ, rowOffset, rowTiles, wrapHeight, wrapWidth, type Tile } from './timeline';
import type { MarqueeValues } from './useMarqueeDrive';

export type MarqueeProps = { width: number; height: number; images: (SkImage | null)[]; font: SkFont | null; v: MarqueeValues; stageOp: SharedValue<number> };

export function Marquee({ width, height, images, font, v, stageOp }: MarqueeProps) {
  const x0 = -wrapWidth(width, height) / 2;
  const y0 = -wrapHeight() / 2;
  const outer = useDerivedValue(() => [
    { translateX: width / 2 }, { translateY: height / 2 }, { rotate: (MQ.rotateDeg * Math.PI) / 180 }, { scale: v.scale.value },
  ]);
  // The wrap's `filter: blur(σ)` (none below .25 px) and the stage's opacity (.3 s) live on the layer paint.
  const layer = useDerivedValue(() => {
    const p = Skia.Paint();
    const s = v.sigma.value;
    if (s > 0) p.setImageFilter(Skia.ImageFilter.MakeBlur(s, s, TileMode.Decal, null));
    p.setAlphaf(stageOp.value);
    return p;
  });
  const rows = useMemo(() => Array.from({ length: MQ.rows }, (_, r) => rowTiles(r)), []);
  return (
    <Group transform={outer}>
      <Group layer={layer}>
        {rows.map((tiles, i) => <Row key={i} i={i} tiles={tiles} x0={x0} y={y0 + i * MQ.rowStep} dist={v.dist} images={images} font={font} />)}
      </Group>
    </Group>
  );
}

function Row({ i, tiles, x0, y, dist, images, font }: { i: number; tiles: Tile[]; x0: number; y: number; dist: SharedValue<number>; images: (SkImage | null)[]; font: SkFont | null }) {
  const transform = useDerivedValue(() => [{ translateX: rowOffset(dist.value, i) }]);
  return (
    <Group transform={transform}>
      {tiles.map((tile, j) => <TileNode key={j} tile={tile} x={x0 + j * MQ.step} y={y} images={images} font={font} />)}
    </Group>
  );
}

// 168×112 r12, box-shadow 0 18px 40px rgba(0,0,0,.55) (σ 20); photo tiles background-size: cover; telltale tiles a 40 px glyph.
function TileNode({ tile, x, y, images, font }: { tile: Tile; x: number; y: number; images: (SkImage | null)[]; font: SkFont | null }) {
  const { tileW: w, tileH: h, radius: r } = MQ;
  const image = tile.photo !== undefined ? images[tile.photo] : null;
  const glyph = useMemo(() => (tile.glyph && font ? glyphPlacement(font, tile.glyph) : null), [font, tile.glyph]);
  return (
    <>
      <RoundedRect x={x} y={y + MQ.shadow.dy} width={w} height={h} r={r} color="black" opacity={MQ.shadow.alpha}>
        <BlurMask blur={MQ.shadow.sigma} style="normal" />
      </RoundedRect>
      <RoundedRect x={x} y={y} width={w} height={h} r={r} color={tile.base} />
      {image && (
        <RoundedRect x={x} y={y} width={w} height={h} r={r}>
          <ImageShader image={image} fit="cover" rect={{ x, y, width: w, height: h }} tx="decal" ty="decal" />
        </RoundedRect>
      )}
      {glyph && font && <SkText font={font} text={glyph.text} x={x + glyph.dx} y={y + glyph.dy} color={tile.tone} />}
    </>
  );
}

// The source centres the <i> glyph with flexbox: x by the glyph's advance, baseline so the (ascent + descent) line box is centred.
export function glyphPlacement(font: Pick<SkFont, 'getGlyphIDs' | 'getGlyphWidths' | 'getMetrics'>, name: string) {
  const cp = (glyphMap as Record<string, number>)[name];
  const text = String.fromCodePoint(cp);
  const ids = font.getGlyphIDs(text);
  const adv = font.getGlyphWidths(ids)[0] ?? MQ.glyphSize;
  const m = font.getMetrics();
  return { text, dx: (MQ.tileW - adv) / 2, dy: MQ.tileH / 2 - (m.ascent + m.descent) / 2 };
}
```

- [ ] **Step 4: Write `src/screens/splash/Stage.tsx`**

```tsx
// The single Skia canvas under the RN layers: marquee (blur layer inside the zoom/rotate group), vignette, the crash photo with
// its live filter, the veil, and the bubble's backdrop filter. Everything animated is a shared/derived value.
import { BackdropFilter, Blur, Canvas, ColorMatrix, Fill, Group, ImageFilter, Image as SkImage, LinearGradient as SkLinearGradient, RadialGradient, Rect, Skia, TileMode, useFont, useImage, vec, type SkImage as SkImageType } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { HERO, TILES } from '../../fixtures/splash';
import { color } from '../../theme/tokens';
import type { BubbleValues } from './Bubble';
import { Marquee } from './Marquee';
import { MQ, colorMatrix, coverRect } from './timeline';
import type { MarqueeValues } from './useMarqueeDrive';
import type { TimelineValues } from './useSplashTimeline';

const REMIX = require('../../assets/fonts/remixicon.ttf');

export type StageProps = { width: number; height: number; marquee: MarqueeValues; tl: TimelineValues; bubble: BubbleValues; bubbleMounted: boolean };

export function Stage({ width, height, marquee, tl, bubble, bubbleMounted }: StageProps) {
  const t1 = useImage(TILES[0]);
  const t2 = useImage(TILES[1]);
  const t3 = useImage(TILES[2]);
  const t4 = useImage(TILES[3]);
  const t5 = useImage(TILES[4]);
  const hero = useImage(HERO);
  const font = useFont(REMIX, MQ.glyphSize);
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} testID="stage">
      <Fill color={color.splash} />
      <Marquee width={width} height={height} images={[t1, t2, t3, t4, t5]} font={font} v={marquee} stageOp={tl.stageOp} />
      <Vignette width={width} height={height} opacity={tl.stageOp} />
      <Photo width={width} height={height} image={hero} scale={tl.photoScale} opacity={tl.photoOp} fx={tl.photoFx} />
      <Veil width={width} height={height} opacity={tl.veilOp} />
      {bubbleMounted && <BubbleBackdrop v={bubble} />}
    </Canvas>
  );
}

// radial-gradient(118% 76% at 50% 50%, rgba(8,8,10,0) 22%, rgba(8,8,10,.68) 64%, #08080A 100%) — the two sizes are radii.
function Vignette({ width, height, opacity }: { width: number; height: number; opacity: SharedValue<number> }) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <RadialGradient
        c={vec(0, 0)} r={1}
        colors={['rgba(8,8,10,0)', 'rgba(8,8,10,0.68)', '#08080A']} positions={[0.22, 0.64, 1]}
        transform={[{ translateX: width / 2 }, { translateY: height / 2 }, { scaleX: 1.18 * width }, { scaleY: 0.76 * height }]}
      />
    </Rect>
  );
}

// crash-hero.jpg cover 50% 40%; opacity .32 s; filter none → blur(11px) brightness(.6) saturate(.9) .65 s; scale 1.1 → 1 → 1.16 1.6 s.
// `filter` precedes `transform` in CSS, so the blur sits on the image inside the scale group (σ scales with it).
function Photo({ width, height, image, scale, opacity, fx }: { width: number; height: number; image: SkImageType | null; scale: SharedValue<number>; opacity: SharedValue<number>; fx: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ scale: scale.value }]);
  const blur = useDerivedValue(() => 11 * fx.value);
  const matrix = useDerivedValue(() => colorMatrix(1 - 0.4 * fx.value, 1 - 0.1 * fx.value));
  if (!image) return null;
  const r = coverRect(width, height, image.width(), image.height());
  return (
    <Group transform={transform} origin={vec(width / 2, height / 2)}>
      <SkImage image={image} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" opacity={opacity}>
        <Blur blur={blur} mode="clamp" />
        <ColorMatrix matrix={matrix} />
      </SkImage>
    </Group>
  );
}

// linear-gradient(180deg, rgba(8,8,10,.30) 0%, rgba(8,8,10,.06) 40%, rgba(8,8,10,.66) 100%), opacity .4 s.
function Veil({ width, height, opacity }: { width: number; height: number; opacity: SharedValue<number> }) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <SkLinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['rgba(8,8,10,0.30)', 'rgba(8,8,10,0.06)', 'rgba(8,8,10,0.66)']} positions={[0, 0.4, 1]} />
    </Rect>
  );
}

// The face's outline: border-radius 28px with border-bottom-left-radius 9px (Skia rrects are uniform per axis, so a path).
export function bubblePath(x: number, y: number, w: number, h: number, r = 28, rbl = 9) {
  'worklet';
  const p = Skia.Path.Make();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arcToTangent(x + w, y, x + w, y + r, r);
  p.lineTo(x + w, y + h - r);
  p.arcToTangent(x + w, y + h, x + w - r, y + h, r);
  p.lineTo(x + rbl, y + h);
  p.arcToTangent(x, y + h, x, y + h - rbl, rbl);
  p.lineTo(x, y + r);
  p.arcToTangent(x, y, x + r, y, r);
  p.close();
  return p;
}

// backdrop-filter: blur(16px) saturate(1.6), clipped to the face and moving with the pop. CSS fades a backdrop-filtered element
// by its opacity; a Skia backdrop has no alpha, so the strength (σ and the saturation boost) follows the same curve instead.
function BubbleBackdrop({ v }: { v: BubbleValues }) {
  const clip = useDerivedValue(() => { const f = v.frame.value; return bubblePath(f.x, f.y, f.w, f.h); });
  const origin = useDerivedValue(() => { const f = v.frame.value; return { x: f.x + f.w / 2, y: f.y + f.h / 2 }; });
  const transform = useDerivedValue(() => [{ translateY: v.ty.value }, { scale: v.scale.value }]);
  const filter = useDerivedValue(() => {
    const s = v.pop.value * v.opacity.value;
    const sat = Skia.ImageFilter.MakeColorFilter(Skia.ColorFilter.MakeMatrix(colorMatrix(1, 1 + 0.6 * s)), null);
    return s > 0.001 ? Skia.ImageFilter.MakeBlur(16 * s, 16 * s, TileMode.Clamp, sat) : sat;
  });
  return <BackdropFilter clip={clip} origin={origin} transform={transform} filter={<ImageFilter filter={filter} />} />;
}
```

- [ ] **Step 5: Run** `npm test -- stage && npm run typecheck` → PASS. Typing notes: every Skia component accepts `SharedValue<T>` for any prop (`SkiaProps`); if a specific prop refuses a derived value, cast that one value (`as unknown as T`) and say so in the report — do not replace a shared value with React state.

- [ ] **Step 6: Checkpoint** — "feat: Skia splash stage — blurred marquee, live photo filter, bubble backdrop"

---

### Task 10: Compose `Splash`, swap it into `OverlayHost`, delete the stub

**Files:**
- Create: `src/screens/splash/Splash.tsx`, `src/screens/splash/__tests__/Splash.test.tsx`
- Modify: `src/overlays/OverlayHost.tsx`, `src/overlays/__tests__/OverlayHost.test.tsx`
- Delete: `src/screens/SplashStub.tsx`, `src/screens/__tests__/SplashStub.test.tsx`

**Interfaces:**
- Produces: `Splash({ onDone })` — the stub's contract; mounted last in `OverlayHost` (z60) while `splash` is true.

- [ ] **Step 1: Write the failing tests**

`src/screens/splash/__tests__/Splash.test.tsx`:

```tsx
jest.mock('../useMarqueeDrive');

import { act, fireEvent, render } from '@testing-library/react-native';
import { Splash } from '../Splash';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('runs the source timeline: mark → bubble at 3.5 s → auth at 7.1 s; REPLAY restarts it', () => {
  const onDone = jest.fn();
  const { getByText, queryByText, getByTestId } = render(<Splash onDone={onDone} />);
  expect(getByTestId('stage')).toBeTruthy();
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByText('REPLAY')).toBeTruthy();
  expect(queryByText('Did you f*cking check?')).toBeNull();
  expect(getByTestId('auth').props.pointerEvents).toBe('none');
  act(() => { jest.advanceTimersByTime(3500); });
  expect(getByText('Did you f*cking check?')).toBeTruthy();
  expect(getByTestId('skia-BackdropFilter')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(3600); });
  expect(queryByText('Did you f*cking check?')).toBeNull();
  expect(getByTestId('auth').props.pointerEvents).toBe('auto');
  fireEvent.press(getByText('Google'));
  expect(onDone).toHaveBeenCalledTimes(1);
  fireEvent.press(getByText('REPLAY'));
  expect(getByTestId('auth').props.pointerEvents).toBe('none');
  act(() => { jest.advanceTimersByTime(3500); });
  expect(getByText('Did you f*cking check?')).toBeTruthy();
});
```

Append to `src/overlays/__tests__/OverlayHost.test.tsx` (inside the existing `describe`, keep the existing `jest.mock('expo-router', …)`; add `jest.mock('../../screens/splash/useMarqueeDrive');` next to it at the top of the file):

```tsx
  it('mounts the real Splash while splash is true', () => {
    useAppStore.setState({ splash: true });
    const { getByText, getByTestId } = render(<OverlayHost />);
    expect(getByTestId('stage')).toBeTruthy();
    expect(getByText('REPLAY')).toBeTruthy();
    expect(getByText('RECALL HUB')).toBeTruthy();
  });
```

- [ ] **Step 2: Run** `npm test -- Splash OverlayHost` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/Splash.tsx`**

```tsx
// design/Splash.dc.html — the whole artboard. Layer order (bottom → top) follows the DOM: stage (Skia: marquee + vignette + photo +
// veil + bubble backdrop) → mark → blob layer → bubble face → auth → REPLAY. Same `onDone` contract as the Slice 1 stub.
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { color } from '../../theme/tokens';
import { AuthPanel } from './AuthPanel';
import { Blobs } from './Blobs';
import { Bubble, useBubbleValues } from './Bubble';
import { Mark } from './Mark';
import { ReplayPill } from './ReplayPill';
import { Stage } from './Stage';
import { useMarqueeDrive } from './useMarqueeDrive';
import { useSplashTimeline } from './useSplashTimeline';

export function Splash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const bubble = useBubbleValues();
  const { phase, runId, run, v } = useSplashTimeline(bubble);
  const marquee = useMarqueeDrive(runId);
  const markOpacity = useDerivedValue(() => v.stageOp.value * v.markOp.value);
  const bubbleUp = phase === 'bubble' || phase === 'fade';
  return (
    <View testID="splash" style={[StyleSheet.absoluteFill, { backgroundColor: color.splash }]}>
      <Stage width={width} height={height} marquee={marquee} tl={v} bubble={bubble} bubbleMounted={bubbleUp} />
      <Mark opacity={markOpacity} />
      <Blobs opacity={v.blobOp} />
      {bubbleUp && <Bubble key={runId} v={bubble} />}
      <AuthPanel opacity={v.authOp} active={phase === 'auth'} runId={runId} onDone={onDone} />
      <ReplayPill onPress={run} />
      <StatusBar style="light" />
    </View>
  );
}
```

- [ ] **Step 4: Swap it into `src/overlays/OverlayHost.tsx`** — replace `import { SplashStub } from '../screens/SplashStub';` with `import { Splash } from '../screens/splash/Splash';`, replace `{splash && <SplashStub onDone={dismissSplash} />}` with `{splash && <Splash onDone={dismissSplash} />}`, and update the header comment to "… Toast, Splash". Nothing else changes.

- [ ] **Step 5: Delete the stub** — `git rm src/screens/SplashStub.tsx src/screens/__tests__/SplashStub.test.tsx` is the controller's; the implementer deletes the two files with `rm`.

- [ ] **Step 6: Run** `npm test && npm run typecheck` → all PASS.

- [ ] **Step 7: Checkpoint** — "feat: real Splash replaces the stub"

---

### Task 11: Emulator verification pass (controller)

**Files:**
- Create: `docs/reference/emu-splash-*.png`
- Modify: `docs/reference/verification.md` (append a Slice 2 section), any file a genuine mistake lives in

**Interfaces:**
- Consumes: the references (`docs/reference/splash-*.png`, `splash-geometry.json`) and the finished app.
- Produces: the fidelity record the spec's acceptance criteria point at.

- [ ] **Step 1: Run the app** — boot `s24ultraProxy`; `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start < /dev/null` (background); `adb reverse tcp:8081 tcp:8081`; open `exp://127.0.0.1:8081`. If Expo Go shows "Something went wrong", tap reload.

- [ ] **Step 2: Capture** — with `adb exec-out screencap -p`: `emu-splash-marquee-0s` (tap REPLAY, capture immediately), `-1s`, `-2s`, `-2.6s` (from REPLAY + delay; screencap latency ≈ 0.1 s), `emu-splash-photo` (3.2 s), `-bubble` (4.6 s), `-fade` (6.8 s), `-auth-email` (8.3 s), then drive the auth by `adb shell input tap/text`: `-auth-email-filled`, `-auth-password`, `-auth-password-filled`, `-auth-password-eye`, `-auth-confirm`, `-auth-confirm-error`, and `-replay-0.3s`. Timing captures use `adb shell "input tap X Y; sleep T; screencap -p /sdcard/x.png"` so the delay runs on the device.

- [ ] **Step 3: Compare** each pair with the reference at matched physical scale, in this order: geometry (positions/sizes from `splash-geometry.json`) → type → colours → state content → motion by eye on the emulator (marquee acceleration and blur ramp, cut, bubble pop, blob drift, step entrance, REPLAY cross-fade). Check the parked items: does the bubble copy wrap at 411 dp; is the marquee gap visible under the vignette; does the `filter` blur on StepIn / the bubble highlight take effect.

- [ ] **Step 4: Frame-time sanity** — `adb shell dumpsys gfxinfo host.exp.exponent reset`, tap REPLAY, wait 4 s, `adb shell dumpsys gfxinfo host.exp.exponent` → note "Janky frames" for the marquee window. The emulator (software GL) is a lower bound only.

- [ ] **Step 5: Fix mistakes, record limits** — anything that is a transcription/logic mistake is fixed in code (with its test); anything that is a platform limit goes into the flags list.

- [ ] **Step 6: Append to `docs/reference/verification.md`**

```markdown
# Slice 2 verification — Splash on Android emulator (s24ultraProxy, Pixel 8 / API 35)

Date: <date>
Reference: docs/reference/splash-<state>.png (design, 430×932 @2x)   Emulator: docs/reference/emu-splash-<state>.png (411 dp @2.625x)

| State | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Marquee 0 s / 1 s / 2 s / 2.6 s | splash-marquee-*.png | emu-splash-marquee-*.png | | tile positions are time-dependent; compare look |
| Photo cut | splash-photo.png | emu-splash-photo.png | | |
| Bubble | splash-bubble.png | emu-splash-bubble.png | | |
| Fade | splash-fade.png | emu-splash-fade.png | | |
| Auth — email / filled / password / filled / eye / confirm / error | splash-auth-*.png | emu-splash-auth-*.png | | |
| REPLAY cross-fade | splash-replay-0.3s.png | emu-splash-replay-0.3s.png | | |

## Known, accepted differences (spec §9)
- <copy the §9 flags that apply, one line each>

## Differences found and fixed during this pass
- <one line each, or "none">

## Differences found and NOT fixed (need a decision)
- <the §15 parked items with what the emulator showed>

## Frame times
- Marquee window janky frames: <n>% of <m> (emulator, software GL — lower bound)
```

- [ ] **Step 7: Run the full suite** — `npm test && npm run typecheck` → PASS.

- [ ] **Step 8: Checkpoint** — "docs: slice 2 emulator verification record"

---

### Task 12: On-device pass on the S24 Ultra (with Slice 1's Task 23)

**Files:**
- Modify: `docs/reference/verification.md` (append the on-device section)

- [ ] **Step 1:** Expo Go on the phone (Play Store), `npx expo start`, scan the QR (or USB: `adb devices`, then the Task 11 recipe).
- [ ] **Step 2:** Watch a cold launch and three REPLAYs at 120 Hz: marquee smoothness through the blur ramp, the cut, the bubble pop, blob drift, step entrances. Check the bubble copy's line count by eye; the keyboard behaviour on the email field (layout compresses, footer above the keyboard); Android back on the password step.
- [ ] **Step 3:** Append to `verification.md`:

```markdown
## On-device — Samsung S24 Ultra (Slice 2)
Date: <date>   Expo Go version: <version>   Display mode: <FHD+ / QHD+>
- Marquee at 120 Hz: smooth / janky (where)
- Bubble copy: one line / two lines
- Keyboard: auth column compresses, footer visible — yes / no
- Back button on password step returns to email — yes / no
- Anything that differs from the emulator: <list or none>
User sign-off: <name / date>
```

- [ ] **Step 4: Checkpoint** — "docs: slice 2 on-device verification"

---

## Self-review notes (already applied)

- **Spec coverage:** §3 sizing → Tasks 7, 9, 10 (`useWindowDimensions`, insets in Tasks 5–6); §4 architecture → Tasks 8–10; §5 state/timeline → Tasks 3, 4, 8; §6 tokens → Task 1; §7 fixtures → Task 3; §8 measurements → Tasks 5, 6, 7, 9; §9 effects/flags → Tasks 7, 9 and the Task 11 record; §10 assets/fonts → Tasks 1, 2; §11 dependencies → already installed; §12 verification → Tasks 11, 12; §13 risks → Task 9 Step 5 note, Task 6 Step 4 note, Task 11 Step 3; §14 acceptance → Task 10 test + Task 11 table; §15 parked → Task 11 "NOT fixed".
- **Type consistency:** `Tile.photo` is an index into `TILES` (Task 3) and `Marquee` indexes `images` with it (Task 9); `BubbleValues` is defined once in Task 7 and consumed by Tasks 8–10; `TimelineValues`/`MarqueeValues` are defined in Task 8 and consumed by Task 9's `StageProps`; `AuthPanel`'s `runId` is the timeline's `runId` (starts at 1 after the mount run); `COPY.emailTitle` carries the explicit line break that the tests assert.
- **Order of layers** in `Splash.tsx`: Stage → Mark → Blobs → Bubble → AuthPanel → ReplayPill, matching the DOM order except the mark (spec §9 flag).
- **No implementer runs git or installs packages.** The controller commits after verifying each task.
