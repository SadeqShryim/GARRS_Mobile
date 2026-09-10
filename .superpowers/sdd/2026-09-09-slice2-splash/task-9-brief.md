# Task 9 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-9-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

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

