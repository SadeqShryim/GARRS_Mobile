# Task 20 Report: Recall sheet

## What was implemented

Created `src/screens/RecallSheet.tsx` exactly per the brief's Step 3, and
`src/screens/__tests__/RecallSheet.test.tsx` exactly per the brief's Step 1
(both copied verbatim, including Unicode punctuation).

`RecallSheet({ onDetails })`:
- Finds the vehicle with an open recall from the store (`s.vehicles.find((x) => x.recall)`); returns `null` if none.
- Renders a `Sheet` with `title={r.title}`, `sub={r.code + ' · ' + v.name.toUpperCase()}`, `testID="sheet-recall"`.
- Renders the four `RECALL_ROWS` as hairline rows (Mono key / Sans value).
- Renders a wide blue `MetalButton` (flex 1.5, width "auto", height 54, radius 16, gap 9, iconSize 17, fontSize 15, icon `calendar-2-line`) whose label flips between `'Schedule Repair'` and `'Scheduled'` based on `scheduled` store state, and on press calls `schedule()`, `closeSheet()`, `flash('Service booked · Thu 10:30 AM')`.
- Renders an `OutlinePill` "Details" (icon `arrow-right-up-line`, height 54) that on press calls `closeSheet()`, `switchTab('recalls')`, `flash(r.code + ' · opening recall detail')`, then `onDetails()`.

No deviation from the brief's code for Steps 1 and 3 — every consumed interface (`Sheet`, `MetalButton`, `OutlinePill`, `Mono`/`Sans`, `RECALL_ROWS`, `useAppStore` shape/actions, `color.hair07`/`color.ink3`/`color.ink`) matched what the brief's code assumed, verified by reading each file before writing.

## Deviation: Step 4 (mount) skipped, per explicit task instruction

Per this task's dispatch instructions (not the brief), `src/overlays/OverlayHost.tsx` was **not** edited — four overlay screens (Tasks 18–21) are being built concurrently by different implementers and the controller mounts them together afterward. `OverlayHost.tsx` was verified untouched (still only renders `<Toast />`).

**What the controller must add when mounting**, quoting the brief's Step 4 verbatim:

```tsx
import { useRouter } from 'expo-router';
import { RecallSheet } from '../screens/RecallSheet';
// inside OverlayHost:
const router = useRouter();
// JSX, after the add sheet:
{sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
```

`onDetails` must navigate to the recalls tab route (`/(tabs)/recalls`) via `expo-router`'s `useRouter().navigate`. Note the component itself already calls `switchTab('recalls')` on the store before invoking `onDetails()`, so `onDetails`'s only remaining job at mount time is the actual router navigation to keep the URL/route in sync with the store's `tab` state.

## TDD evidence

**RED** — `npm test -- RecallSheet` before creating `RecallSheet.tsx` (test file existed, implementation did not):

```
FAIL src/screens/__tests__/RecallSheet.test.tsx
  ● Test suite failed to run
    Cannot find module '../RecallSheet' from 'src/screens/__tests__/RecallSheet.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

**GREEN** — `npm test -- RecallSheet` after implementation:

```
PASS src/screens/__tests__/RecallSheet.test.tsx (14.47 s)
  RecallSheet
    √ shows the recall title, code line and four rows (814 ms)
    √ Schedule Repair schedules, closes and toasts; label flips to Scheduled (1418 ms)
    √ Details closes, switches to recalls, toasts and calls back (317 ms)
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Also verbatim-verified the Unicode punctuation at byte level via a small Node script before running tests: `·` is U+00B7 (middle dot) in all three occurrences, `—` is U+2014 (em dash) in "Tesla Service — 6.2 mi" — matches the brief exactly.

## Full-suite and typecheck output (run once before reporting)

`npm test` (full suite):

```
Test Suites: 21 passed, 21 total
Tests:       109 passed, 109 total
Time:        21.977 s
```

All 21 suites pass, including mine. One pre-existing, unrelated console warning appeared in `src/ui/__tests__/Toast.test.tsx` ("An update to Toast inside a test was not wrapped in act(...)") — this is in a file I did not touch (not part of this task) and did not fail the test; noting per instructions, not fixing.

`npm run typecheck` (`tsc --noEmit`):

```
(no output — clean, exit 0)
```

## Files changed

- Created: `C:\GARRS_Mobile\src\screens\RecallSheet.tsx`
- Created: `C:\GARRS_Mobile\src\screens\__tests__\RecallSheet.test.tsx`
- Not touched: `src/overlays/OverlayHost.tsx` (per explicit task exception)

No commits (git hold).

## Self-review against the brief

- Test file: byte-identical to brief's Step 1 code block, including apostrophe-free copy and exact Unicode dot/dash characters. Verified via string-search script.
- Implementation file: byte-identical to brief's Step 3 code block. No extra features, no extra props, no styling changes.
- Consumed interfaces double-checked before writing (not just trusted from the brief): `Sheet` (title/sub/onClose/children/testID props confirmed), `MetalButton` (tint/label/icon/flex/width/height/radius/gap/iconSize/fontSize/onPress props confirmed, including `width: 'auto'` handling), `OutlinePill` (label/icon/height/onPress confirmed), `Mono`/`Sans` from `Txt.tsx` (size/ls/color props confirmed), `RECALL_ROWS` fixture (exact four rows: SEVERITY/REMEDY/DEALER/EST. TIME with exact values, confirmed matches test expectations "Tesla Service — 6.2 mi" and "45 minutes"), `useAppStore` (confirmed `vehicles`, `scheduled`, `schedule`, `closeSheet`, `switchTab`, `flash` all exist with the exact signatures the brief's code assumes), `SEED_VEHICLES` (confirmed vehicle id 1 "Model S Plaid" carries the recall `{ code: 'NHTSA 24V-137', title: 'Rear camera image failure' }` used by the test).
- Confirmed only the two intended files were created/modified; `OverlayHost.tsx` left untouched (verified by reading its current contents — unchanged from its Tasks-18-21 stub comment).
- Ran the test file in isolation (RED then GREEN) and the full suite + typecheck once at the end, as instructed.

## Deferred steps

- Step 6 (emulator verification, screenshot `t20-recall.png` vs `sheet-recall.png`) — **deferred**, no emulator available this session, per session environment facts.
- Step 7 (checkpoint commit "feat: recall sheet") — **not done**, git is on hold this session; no commits were made ("no commits (git hold)").
- Step 4 (mount in `OverlayHost.tsx`) — **skipped** per this task's explicit dispatch instruction (see Deviation section above); the controller will perform this after all four concurrent overlay tasks land.

## Concerns

None. All consumed interfaces matched the brief's assumptions exactly with no surprises; the test suite and typecheck are both clean; the only unmounted piece is the explicitly-deferred Step 4, whose exact required line is quoted above for the controller.
