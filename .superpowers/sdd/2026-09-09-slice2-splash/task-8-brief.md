# Task 8 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-8-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

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

