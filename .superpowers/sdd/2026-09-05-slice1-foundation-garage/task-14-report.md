# Task 14 Report: `Sheet`, `SlideUpScreen`, `Toast`, `OutlinePill`, `OverlayHost`

## Status: DONE

## Files created
- `src/ui/Sheet.tsx`
- `src/ui/SlideUpScreen.tsx`
- `src/ui/Toast.tsx`
- `src/ui/OutlinePill.tsx`
- `src/overlays/OverlayHost.tsx`
- `src/ui/__tests__/Sheet.test.tsx`
- `src/ui/__tests__/Toast.test.tsx`

## Files modified
- `app/_layout.tsx` — added `import { OverlayHost } from '../src/overlays/OverlayHost';` and replaced `{/* OverlayHost is mounted here in Task 14 */}` with `<OverlayHost />`. No other lines touched.
- `jest.setup.ts` — one-line fix, see "Unplanned fix" below.

All component files were transcribed verbatim from the brief (Steps 3–6), with no deviations.

## Step 2: RED

```
$ npm test -- Sheet Toast
FAIL src/ui/__tests__/Sheet.test.tsx
  Cannot find module '../Sheet' from 'src/ui/__tests__/Sheet.test.tsx'
FAIL src/ui/__tests__/Toast.test.tsx
  Cannot find module '../Toast' from 'src/ui/__tests__/Toast.test.tsx'
Test Suites: 2 failed, 2 total
```

## Unplanned fix required to reach GREEN

After writing `Sheet.tsx`/`Toast.tsx`/`SlideUpScreen.tsx` verbatim, `npm test -- Sheet Toast` failed at runtime (not compile time) with:

```
TypeError: (0 , _reactNativeSafeAreaContext.useSafeAreaInsets) is not a function
```

Root cause: `react-native-safe-area-context@5.7.0`'s jest mock (`node_modules/react-native-safe-area-context/jest/mock.tsx`) does `export default { useSafeAreaInsets: jest.fn(...), ... }` — a **default** export only, no named exports. The existing `jest.setup.ts` line was:

```ts
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock'));
```

This makes the mocked module's shape `{ default: {...}, __esModule: true }`, so `useSafeAreaInsets` (and `useSafeAreaFrame`, `SafeAreaProvider`) were never actually exposed at the top level — any consumer of `useSafeAreaInsets` would throw. This bug was latent because no component before Task 14 called `useSafeAreaInsets` in a test.

Since the task facts explicitly state "safe-area (`useSafeAreaInsets` returns zeros)" as an established, working mock, and three of this task's five components rely on it, I fixed the single existing mock line (not a competing mock) to unwrap the default export:

```ts
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
```

This matches the package's own TypeScript declaration (`lib/typescript/jest/mock.d.ts` — `declare const _default: {...}; export default _default;`) and is the documented way to consume this mock. Behavior after the fix: `useSafeAreaInsets()` returns `{ top: 0, left: 0, right: 0, bottom: 0 }` as intended, matching the brief's stated fact. No other jest mocks were added or changed.

This is a shared setup file; flagging prominently in case other concurrent tasks were relying on (or independently hit) the same latent bug.

## Step 7: GREEN

```
$ npm test -- Sheet Toast
PASS src/ui/__tests__/Toast.test.tsx
PASS src/ui/__tests__/Sheet.test.tsx
Test Suites: 2 passed, 2 total
Tests:       2 passed, 2 total
```

Full suite:

```
$ npm test
Test Suites: 16 passed, 16 total
Tests:       92 passed, 92 total
```

(92 = the pre-existing 81 + the new Sheet/Toast tests + tests from other agents' concurrently-landed files, e.g. HumpTabBar.test.tsx, TabStub.test.tsx, which were already present/passing at run time and are not part of this task.)

Typecheck:

```
$ npm run typecheck
> tsc --noEmit
(no output — clean)
```

No typing adjustments were needed. `boxShadow` inside `StyleSheet.create` (used in `Sheet.tsx`'s `panel` style and `Toast.tsx`'s inline style) type-checked as written, verbatim from the brief — no `as ViewStyle` cast was required.

## Self-review against the checklist

- Sheet: scrim `rgba(23,22,26,0.28)` via `color.scrim` token + `BlurView intensity={blur.scrim}` with `blurTarget={target}` from `useAppBlurTarget()` — present. Panel radii `borderTopLeftRadius/borderTopRightRadius: 22` (bottom corners square, i.e. `22 22 0 0`) — present. `boxShadow: '0 -8px 40px rgba(0,0,0,0.18)'` — present verbatim. Padding `paddingTop: 10, paddingHorizontal: 20`, `paddingBottom: 28 + insets.bottom` — present. Handle `36×4`, `#dcdbd8` (`color.handle`), `marginBottom: 18` — present. Slide `dur.sheet` (280ms) with `bez(ease.standard)` — present. Scrim fade `dur.fade` (200ms) — present.
- SlideUpScreen: slide `dur.screen` (340ms) with `bez(ease.sheet)` — present. Header row `paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8` — present. Close button `38×38`, `marginLeft: -9` — present.
- Toast: `left: 20, right: 20`, `bottom: 104 + insets.bottom` — present. Background `color.ink` = `#17161A` — present. `boxShadow: '0 8px 24px rgba(0,0,0,0.2)'` — present verbatim. Reads store via `useAppStore((s) => s.toast)` selector so `rerender(<Toast />)` in the test picks up `flash()` — confirmed by the passing test.
- OutlinePill: `borderWidth: 1, borderColor: color.hair14` (`rgba(0,0,0,0.14)`) — present. Label `size 14, weight 500` — present. Trailing icon `size 15` — present (icon placed after label, matching "trailing").
- OverlayHost: `pointerEvents="box-none"` on the wrapping `View` — present. Imports only `Toast`, with the placeholder comment `// src/overlays/OverlayHost.tsx — Tasks 18–21 each add one import + one line here.` preserved for future tasks.
- `app/_layout.tsx`: only the import line and the single comment-to-`<OverlayHost />` replacement were changed; diff reviewed line-by-line, nothing else touched.
- Full suite (92 tests, 16 suites) and typecheck both pass clean.

## Concerns

1. **`jest.setup.ts` change** (see above) — a shared file. The fix is narrowly scoped (one line, unwraps a default export that was always meant to be unwrapped) and makes the mock behave exactly as the task's stated facts describe, but since other in-flight agents share this file, flagging it explicitly for visibility. If another agent touches the same line concurrently there could be a conflict to resolve, but the fix itself should not need to change once applied correctly.
2. Non-blocking: `Toast.test.tsx` (verbatim from brief) logs a React `act()` warning because `useAppStore.getState().flash(...)` is called outside of `act()` before `rerender`. This is inherent to the test as specified in the brief, not a defect in `Toast.tsx`. Test still passes.
3. Non-blocking: Jest reports "A worker process has failed to exit gracefully" after the Toast test run, due to the pre-existing `toastTimer` `setTimeout(2200ms)` in `src/store/useAppStore.ts` (Task 9, out of scope) not being cleared at suite teardown. Purely a Jest hygiene warning; does not fail any test.
