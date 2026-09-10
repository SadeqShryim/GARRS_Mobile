# Task 5 report — Glass pill, glass field, Google mark, REPLAY pill

**Status: DONE**

## Files created
- `src/screens/splash/GlassPill.tsx`
- `src/screens/splash/GlassField.tsx`
- `src/screens/splash/GoogleMark.tsx`
- `src/screens/splash/ReplayPill.tsx`
- `src/screens/splash/__tests__/glass.test.tsx`

No other files were touched. `src/screens/splash/Bubble.tsx` and `src/screens/splash/__tests__/layers.test.tsx` already existed (Task 7's parallel work) — left untouched and not needed for this task's gate, which passed.

## Test output
`npm test -- glass`: **6/6 passed**, 1 suite.

Full gate `npm test`: **154/154 passed, 30/30 suites** (includes Task 7's already-landed `layers.test.tsx`, `GarageScreen.test.tsx`, `VehicleStatsScreen.test.tsx`, `OverlayHost.test.tsx`, etc. — all green). `OverlayHost.test.tsx` prints pre-existing "not wrapped in act(...)" console warnings; these are not failures and are unrelated to this task's files.

`npm run typecheck`: **clean, exit 0, no output.**

## Deviations from the brief
1. **`GoogleMark` test assertion (test file only, not the component).** The brief's Step 1 test asserted `expect(JSON.stringify(toJSON())).toContain('#4285F4')`. This failed against the installed `react-native-svg@15.15.4`: its `extractFill`/`extractBrush` pipeline runs every `fill` color through React Native's `processColor` before it reaches the native-tree JSON (confirmed by reading `node_modules/react-native-svg/lib/commonjs/lib/extract/extractBrush.js` — fill becomes `{ type: 0, payload: <processColor output> }`), so the literal hex string can never appear in `toJSON()` output for an SVG `Path`, regardless of how `GoogleMark` itself is written. This isn't a jest quirk; it's how the library always serializes colors for the native side.
   - Fix: import `processColor` from `react-native` in the test and assert `toContain(String(processColor('#4285F4')))` instead of the raw hex literal. Verified this correctly isolates Google's blue path (payload `4282549748`) in the rendered tree.
   - `GoogleMark.tsx` itself is transcribed verbatim — untouched.
2. No `submitBehavior` deviation was needed: it type-checked and behaved correctly as written against RN 0.86's installed types (the brief's fallback — `blurOnSubmit={false}` — was not required).

## Deferred steps
- Step 8 (git checkpoint commit) was **not** performed per the brief's own rules for this task ("Do not run git") and the environment's Rules section — no commit was made. Ready for the controller to commit when it runs its own gate.

## Concerns
None. `GlassPill`, `GlassField`, `ReplayPill` behave exactly as specified and all consuming interfaces (`label/icon/onPress`, the full `GlassFieldProps` shape, `GoogleMark({ size = 19 })`, `ReplayPill({ onPress })`) match what Tasks 6 and 10 will expect.
