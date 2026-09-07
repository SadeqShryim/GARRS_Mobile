# Task 17 report — Vehicle stats screen and its route

**Status: DONE**

## What was implemented

Exactly the three files the brief lists, with code transcribed byte-for-byte from `task-17-brief.md` (extracted programmatically from the brief's fenced code blocks to guarantee verbatim copy, including Unicode punctuation — see punctuation check below):

1. `src/screens/__tests__/VehicleStatsScreen.test.tsx` — the brief's Step 1 test, unmodified (4 test cases: Model S with active recall/tiles/maintenance, Taycan clear row, Schedule Repair + Back interactions, Details reachability).
2. `src/screens/VehicleStatsScreen.tsx` — the brief's Step 3 component: `VehicleStatsScreen({ id, onBack, onRecallDetails })`. Header with back button, name/meta; conditional recall `GlowCard` (dark shell, glow, metal Schedule Repair button + Details outline pill) vs. clear-row banner; health card (`HealthGauge`); 2-column stat tile grid (`width: '48%'`); maintenance rows with progress bars.
3. `app/(tabs)/garage/[id].tsx` — the brief's Step 4 route: reads `id` via `useLocalSearchParams`, renders `VehicleStatsScreen`, wires `onBack` to `router.back()` and `onRecallDetails` to switch the store's tab to `'recalls'` and `router.navigate('/(tabs)/recalls')`.

No other files were touched. `src/overlays/OverlayHost.tsx` (owned by a concurrent task) was not opened for editing.

## TDD evidence

**RED** — moved `VehicleStatsScreen.tsx` and `[id].tsx` aside after writing the test, then ran:

```
npm test -- VehicleStatsScreen
```
```
FAIL src/screens/__tests__/VehicleStatsScreen.test.tsx
  ● Test suite failed to run
    Cannot find module '../VehicleStatsScreen' from 'src/screens/__tests__/VehicleStatsScreen.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

**GREEN** — restored the implementation files, re-ran:

```
npm test -- VehicleStatsScreen
```
```
PASS src/screens/__tests__/VehicleStatsScreen.test.tsx (5.24 s)
  VehicleStatsScreen
    √ shows the Model S with its active recall, tiles and maintenance (370 ms)
    √ shows the clear row for the Taycan (89 ms)
    √ Schedule Repair schedules and toasts; Details calls back; back calls back (311 ms)
    √ Details is reachable while the recall is open (113 ms)
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## Full-suite and typecheck

```
npm test
```
```
Test Suites: 22 passed, 22 total
Tests:       113 passed, 113 total
Time:        12.85 s
```
(One pre-existing `console.error` act()-warning noise from `src/ui/__tests__/Toast.test.tsx` — unrelated to this task, does not fail the suite; the store's `flash()` fires a state update outside `act()` in that test file, which predates Task 17.)

```
npm run typecheck
```
```
> tsc --noEmit
```
Clean — zero errors, zero output.

## Files changed
- Created: `src/screens/__tests__/VehicleStatsScreen.test.tsx`
- Created: `src/screens/VehicleStatsScreen.tsx`
- Created: `app/(tabs)/garage/[id].tsx`

No commits (git hold).

## Deviations from the brief
None. Code, prop names, and copy strings match the brief verbatim (extracted programmatically from its code fences rather than hand-retyped, specifically to avoid a transcription slip).

## Deferred steps
- **Step 6 (emulator verification)** — deferred per session instructions: no emulator available this session. Screenshots `docs/reference/t17-stats-model-s.png` / `t17-stats-taycan.png` vs. references `stats-model-s.png` / `stats-taycan.png` were not captured. This is Task 22/controller's job once the emulator is available.
- **Step 7 (git checkpoint)** — no commits (git hold).

## Self-review findings
- Punctuation byte-check: verified via a Node script reading the brief's raw UTF-8 that every `·` in the brief's copy strings (`metaUpper` construction, `'Free remedy available · …'`, `'Service booked · Thu 10:30 AM'`, `'CHECKED AGAINST NHTSA · ' + s.clearMeta`) is U+00B7 (middle dot), not a lookalike. No em-dashes or apostrophes appear in this brief's copy strings, so nothing else to check at the byte level.
- Confirmed `statsFor` (from Task 7, already landed, unmodified) produces exactly the strings the test expects for vehicle id 1 (Model S Plaid, health 65 → "Fair", oilIn 1200 → "NEXT OIL CHANGE" / "LAST DONE AT 37,200 MI") and id 2 (Taycan, no recall → "No open recalls" / "CHECKED AGAINST NHTSA · 12 MIN AGO"). No changes to `derive.ts` were needed or made.
- Cross-checked every consumed prop/interface against the actual landed source before using it: `GlowCard` (`shell/radius/glow/blobSize/faceOpacity/faceRadius/faceStyle`), `MetalButton` (`tint/label/icon/flex/width/height/radius/gap/iconSize/fontSize/onPress`, sets `accessibilityLabel={label}`), `OutlinePill` (`label/icon/height/onPress`, also sets `accessibilityLabel={label}`), `HealthGauge({ health, gaugeColor, word })`, `Sans`/`Mono` from `Txt.tsx` (`size/lh/ls/weight/color/center`), `Icon({ name, size, color })`, `color`/tokens, and the store's `scheduled`/`schedule`/`flash`/`switchTab` — all match what the brief's code assumes; no adaptation was required.
- Verified only the three brief-listed files were created/modified (checked via `find ... -newer package.json`, which also showed several other in-flight concurrent tasks' files, none touched by this task).
- Route file uses `router.navigate('/(tabs)/recalls')` and `router.back()` — typed routes are not generated this session (no `.expo/types`), so these href/path strings typecheck as plain strings. Flagging per instructions for Task 22's emulator run to re-check: `/(tabs)/recalls` (also already used by other landed screens per the ledger, e.g. Task 20's RecallSheet) and the dynamic `/(tabs)/garage/[id]` route created here (already exercised by Task 16's `router.push`).

## Concerns
None. All consumed interfaces matched the brief's assumptions exactly; no ambiguity encountered.
