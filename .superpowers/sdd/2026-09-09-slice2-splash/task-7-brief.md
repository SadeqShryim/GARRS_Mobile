# Task 7 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-7-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

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

