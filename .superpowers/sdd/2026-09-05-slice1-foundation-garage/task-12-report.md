# Task 12: `GlowCard` — Report

## Files created
- `src/ui/GlowCard.tsx`
- `src/ui/__tests__/GlowCard.test.tsx`

## Step 1 — Failing test written
`src/ui/__tests__/GlowCard.test.tsx` written verbatim from the brief (two cases: no blob when `glow={false}`, blob present when `glow`).

## Step 2 — RED
Command: `npm test -- GlowCard`

```
FAIL src/ui/__tests__/GlowCard.test.tsx
  ● Test suite failed to run
    Cannot find module '../GlowCard' from 'src/ui/__tests__/GlowCard.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

Confirmed failing for the expected reason (module doesn't exist yet).

## Step 3 — Implementation
`src/ui/GlowCard.tsx` written verbatim from the brief, with one allowed deviation per task instructions: the blob's `{ position: 'absolute', left: '50%', top: '50%', width: size, height: size }` style object is cast `as ViewStyle` (in the style array) because strict TS otherwise complains about the `'50%'` string literals in an inferred object type. No geometry was changed — the same percentage values are used.

## Step 4 — GREEN + typecheck
Command: `npm test -- GlowCard`

```
PASS src/ui/__tests__/GlowCard.test.tsx
  GlowCard
    √ renders children and no blob when not glowing (30 ms)
    √ renders the blob when glowing (20 ms)
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

Command: `npm run typecheck`

```
> tsc --noEmit
(no output — clean)
```

Full suite run (`npm test`, no filter) for cross-check:

```
Test Suites: 1 failed, 9 passed, 10 total
Tests:       1 failed, 80 passed, 81 total
```

The single failure is `src/ui/__tests__/DotPattern.test.tsx` (`Unable to find an element with testID: dot-pattern`) — this is a different in-flight agent's file (task builds `src/ui/DotPattern.tsx`), not part of this task. All other suites, including `GlowCard.test.tsx`, pass. Per task instructions this failure is noted and not touched.

## Self-review against brief checklist
- blob3 path via `interpolate` on `[0, 0.25, 0.5, 0.75, 1]`, 5s linear repeat: confirmed — `dur.blob` = 5000 (from `src/theme/tokens.ts`), `Easing.linear`, `withRepeat(withTiming(1, {...}), -1, false)`.
- `BlurTargetView` wraps the blob, ref (`target`) passed as `blurTarget` to `BlurView`: confirmed.
- `blurMethod="dimezisBlurViewSdk31Plus"`: confirmed, present verbatim on `BlurView`.
- Face `View` at `margin: 2` with the 1px inset outline (separate `View` with `borderWidth: 1`, `borderColor: outline`, `pointerEvents="none"`): confirmed.
- `testID="glow-blob"` only when `glow`: confirmed — `Blob` (which carries the testID) is only rendered inside `{glow && <Blob .../>}`; not glowing means the node doesn't render at all, so `queryByTestId('glow-blob')` returns null.
- `useEffect, useRef` imported from `react`: confirmed present.
- No competing mocks added; relied on existing `jest.setup.ts` mocks for `expo-blur` and `react-native-reanimated`.
- Did not touch any other agent's files (`src/store/*`, `app/*`, `src/ui/Icon.tsx`, `src/ui/Txt.tsx`, `src/ui/DotPattern.tsx`, `src/overlays/blurTarget.tsx`).

## Concerns
None. Implementation matches the brief verbatim (with the pre-approved `ViewStyle` cast for percentage positioning). The one full-suite failure (`DotPattern.test.tsx`) belongs to a different concurrent task and was left untouched per instructions.
