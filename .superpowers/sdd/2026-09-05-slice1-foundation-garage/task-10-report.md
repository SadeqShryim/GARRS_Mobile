# Task 10 Report: Root layout — fonts, Icon, Txt, DotPattern, blur-target context

## Status: DONE_WITH_CONCERNS

## What was implemented

All files from the brief's Files list, written verbatim from the brief:

- `src/ui/Icon.tsx` — `Icon({ name, size?, color?, style? })`, `IconName = keyof typeof glyphMap`, `Remix = createIconSet(glyphMap as Record<string, number>, 'remixicon', require('../assets/fonts/remixicon.ttf'))`.
- `src/ui/Txt.tsx` — `Sans` / `Mono` components built by a shared `make(faces)` factory, `style={[{...}, style]}` array form preserved.
- `src/ui/DotPattern.tsx` — nested `MaskedView` + `LinearGradient` fade masks around an `Svg` dot pattern, `testID="dot-pattern"` on the outer `MaskedView`.
- `src/overlays/blurTarget.tsx` — `AppBlurTarget` context (`RefObject<View | null> | null`) and `useAppBlurTarget()`.
- `app/_layout.tsx` — loads Geist/GeistMono weights plus `remixicon: require('../src/assets/fonts/remixicon.ttf')` via `useFonts`, wraps the tree in `GestureHandlerRootView` → `SafeAreaProvider` → `AppBlurTarget.Provider` → `BlurTargetView` (ref shared with the context) → `DotPattern` + `Slot`, hides the splash screen once fonts load.
- `app/index.tsx` (temporary, per brief, to be replaced in Task 13) — renders the shield icon, "Garage" (Sans 600), "RECALL HUB" (Mono, wide tracking).
- Tests: `src/ui/__tests__/Txt.test.tsx`, `src/ui/__tests__/DotPattern.test.tsx` — copied verbatim from the brief.

Font-key consistency check: `useFonts({ ..., remixicon: require(...) })` in `app/_layout.tsx` and `createIconSet(glyphMap as Record<string, number>, 'remixicon', require(...))` in `src/ui/Icon.tsx` both use the exact lowercase string `'remixicon'` — they match.

## One out-of-scope fix required to reach GREEN

`src/ui/__tests__/DotPattern.test.tsx` (brief's exact code) initially failed even after `DotPattern.tsx` was implemented exactly per the brief:

```
Unable to find an element with testID: dot-pattern
```

Root cause: the shared `jest.setup.ts` (owned by Task 1, already merged) mocks `@react-native-masked-view/masked-view` as:

```ts
default: ({ children, style }: { children: React.ReactNode; style?: ... }) =>
  React.createElement(View, { style }, children),
```

This destructures only `children`/`style` out of props and silently drops every other prop — including `testID` and `pointerEvents` — so the mock never forwards the `testID="dot-pattern"` that `DotPattern.tsx` sets on the outer `MaskedView`. This is a pre-existing gap in the shared test mock, not something fixable from `DotPattern.tsx` alone (the brief's `DotPattern.tsx` code is fixed/verbatim and correctly sets `testID` on the real component).

Two other in-flight tasks (task-9, task-12, per their own reports) had already observed and correctly ignored this exact failure as "belongs to Task 10." Since it is Task 10's own test that the brief specifies verbatim, and `jest.setup.ts` is not in Task 10's forbidden-files list (`src/lib/`, `src/fixtures/`, `scripts/`, `src/assets/`, `docs/`, `CLAUDE.md`, `.superpowers/`), I made a minimal, additive, backward-compatible fix to the mock:

```diff
- default: ({ children, style }: { children: React.ReactNode; style?: React.ComponentProps<typeof View>['style'] }) =>
-   React.createElement(View, { style }, children),
+ default: ({ children, ...rest }: { children: React.ReactNode } & React.ComponentProps<typeof View>) =>
+   React.createElement(View, rest, children),
```

This forwards all props (style included, plus testID/pointerEvents/etc.) to the underlying `View`, matching how the real `MaskedView` renders. It does not remove or alter any prior behavior — `style` and `children` still flow through identically — so it cannot regress anything that depended on the old mock. Re-ran the full suite afterward and confirmed no other test (including a concurrent task's `GlowCard.test.tsx`) regressed; in fact `GlowCard.test.tsx` also passed as part of the same run, and the full 81-test suite is green.

I flag this as a concern because it touches a shared, non-owned file (`jest.setup.ts`) while other agents are working concurrently — worth a controller double-check that no other in-flight agent depended on the old (prop-dropping) mock behavior, though by inspection nothing in the repo did (grep for other `masked-view` usages found only `DotPattern.tsx` and `jest.setup.ts` itself).

## RED (Step 2)

```
$ npm test -- src/ui
FAIL src/ui/__tests__/DotPattern.test.tsx — Cannot find module '../DotPattern'
FAIL src/ui/__tests__/Txt.test.tsx — Cannot find module '../Txt'
Test Suites: 2 failed, 2 total
Tests:       0 total
```

## GREEN (Step 8)

After writing all implementation files and the `jest.setup.ts` mock fix:

```
$ npm test -- src/ui
PASS src/ui/__tests__/Txt.test.tsx
PASS src/ui/__tests__/GlowCard.test.tsx   (concurrent task's file, unaffected)
PASS src/ui/__tests__/DotPattern.test.tsx
Test Suites: 3 passed, 3 total
Tests:       5 passed, 5 total
```

Full suite:

```
$ npm test
PASS src/store/__tests__/useAppStore.test.ts
PASS src/lib/__tests__/derive.test.ts
PASS src/lib/__tests__/gradient.test.ts
PASS src/fixtures/__tests__/fixtures.test.ts
PASS src/assets/__tests__/assets.test.ts
PASS src/ui/__tests__/Txt.test.tsx
PASS src/lib/__tests__/rail.test.ts
PASS src/__tests__/smoke.test.tsx
PASS src/ui/__tests__/GlowCard.test.tsx
PASS src/ui/__tests__/DotPattern.test.tsx
Test Suites: 10 passed, 10 total
Tests:       81 passed, 81 total
```

Typecheck:

```
$ npm run typecheck
> tsc --noEmit
(no output — clean pass)
```

## Files created

- `C:\GARRS_Mobile\src\ui\Icon.tsx`
- `C:\GARRS_Mobile\src\ui\Txt.tsx`
- `C:\GARRS_Mobile\src\ui\DotPattern.tsx`
- `C:\GARRS_Mobile\src\overlays\blurTarget.tsx`
- `C:\GARRS_Mobile\app\_layout.tsx`
- `C:\GARRS_Mobile\app\index.tsx`
- `C:\GARRS_Mobile\src\ui\__tests__\Txt.test.tsx`
- `C:\GARRS_Mobile\src\ui\__tests__\DotPattern.test.tsx`

## Files modified (outside the brief's Files list)

- `C:\GARRS_Mobile\jest.setup.ts` — minimal fix to the `@react-native-masked-view/masked-view` mock so it forwards all props (not just `style`/`children`) to the rendered `View`, needed for the brief's own `DotPattern.test.tsx` to pass. See "One out-of-scope fix required to reach GREEN" above for full justification and safety analysis.

## Step 9 — deferred

Emulator verification (`expo start --android`, screenshot to `docs/reference/t10-fonts.png`) is **deferred to the controller**, per task instructions: this PC is ARM64 and the emulator is being rebuilt with a different system image. No `expo start` or emulator command was run.

## Self-review

- All six brief files exist with the brief's exact code (byte-for-byte, confirmed by printing each file back and diffing mentally against the brief). No deviations, no substituted packages.
- `IconName = keyof typeof glyphMap` and the `Record<string, number>` cast are present exactly as specified.
- Mask gradient stops (`[0, 0.1, 0.9, 1]` vertical, `[0, 0.14, 0.86, 1]` horizontal) match the brief exactly.
- `remixicon` font key in `app/_layout.tsx`'s `useFonts` call matches the family string passed to `createIconSet` in `Icon.tsx` (`'remixicon'`, both lowercase) — verified by direct comparison.
- `Txt` test's array-style assertion (`style` as `[{...}, style]`) preserved verbatim — required for the `expect.arrayContaining` assertions to pass.
- Full `npm test` (81/81) and `npm run typecheck` (clean) both pass with pristine output.
- Did not touch `src/lib/`, `src/fixtures/`, `scripts/`, `src/assets/`, `docs/`, `CLAUDE.md`, or `.superpowers/` (other than this report file).

## Concerns

1. **`jest.setup.ts` modification** (detailed above) — a shared file outside my Files list was edited to fix a pre-existing mock bug that blocked the brief's own verbatim test from passing. The change is minimal and additive (forwards more props, drops nothing), and a full-suite re-run shows no regressions, but a controller should confirm no other in-flight or already-merged task relied on the old prop-dropping behavior.
2. Step 9 (emulator visual verification) is not done, per explicit instruction — the "shield icon renders as a glyph, not a box" check and the "Geist SemiBold / Geist Mono with wide tracking" visual check are unverified. The controller's note in `progress.md` (line 60) indicates the Task 2 re-run's smoke screenshot will cover this once the ARM64 emulator exists.
