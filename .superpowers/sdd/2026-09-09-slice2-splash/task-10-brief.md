# Task 10 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-10-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

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

