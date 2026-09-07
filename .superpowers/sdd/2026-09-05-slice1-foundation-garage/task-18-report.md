# Task 18: Add-vehicle sheet — Report

## Summary

Implemented `AddVehicleSheet` exactly per the brief's Step 3 code, with a
test file matching the brief's Step 1 code verbatim. Skipped Step 4 (mount
into `OverlayHost.tsx`) per explicit instruction — the controller mounts all
four concurrently-built overlay screens together afterward. Step 6
(emulator verification) and Step 7 (git checkpoint) also skipped per the
project's current constraints (no emulator this session; git on hold).

## Files changed

- Created: `src/screens/AddVehicleSheet.tsx`
- Created: `src/screens/__tests__/AddVehicleSheet.test.tsx`
- No other files touched. `src/overlays/OverlayHost.tsx` was NOT edited (per
  the explicit exception in the task instructions).

## Verified interfaces before writing code

Read the actual source of every consumed module to confirm the brief's
assumed names/signatures were current:

- `src/store/useAppStore.ts` — `vin`, `setVin`, `addVehicle`, `closeSheet`,
  `openVinHelp`, `flash`, `sheet`, `screen`, `vehicles`, `toast`,
  `resetAppStore`, `openSheet` all present and match the brief's usage.
  `addVehicle()` reads `get().vin`, decodes it, appends to `vehicles`,
  clears `sheet`/`vin`, and flashes `"<name> added · monitoring for
  recalls"` — consistent with test expectations.
- `src/ui/Sheet.tsx` — `Sheet({ title, sub, action, onClose, children,
  testID })` matches exactly.
- `src/lib/derive.ts` — `vinOk`, `decodeVin` present with expected
  signatures (`vinOk` = `raw.length >= 11`).
- `src/fixtures/decode.ts` — `DECODE`, `DEMO_VIN`, `Decoded` type all
  present; `DECODE['1FTVW1EL5NWG00001']` = `{ name: 'F-150 Lightning', meta:
  '2023 Ford · 8,410 mi', ... }`.
- `src/theme/tokens.ts` — `color.hair14`, `color.surface`, `color.ink2`,
  `color.ink`, `color.ink5`, `color.ink7`, `color.disabled`,
  `color.disabledInk`, `color.sunken`, `color.teal`, `font.mono400`,
  `dur.fade` all present.
- `src/ui/Icon.tsx` — `Icon({ name, size, color })`.
- `src/ui/Txt.tsx` — `Sans` exported.
- Cross-checked every copy string and the sub-line's middle dot (U+00B7)
  against `design_handoff_recall_hub/design/GaragePrototype.dc.html`
  `addSheet()` (line ~2217) — all verbatim, confirmed at the codepoint level
  with a small Node script (see TDD evidence below).

No mismatches found; the brief's code was implemented as written.

## TDD evidence

### RED

Command: `npm test -- AddVehicleSheet`

Wrote `src/screens/__tests__/AddVehicleSheet.test.tsx` first (verbatim from
brief Step 1), before `AddVehicleSheet.tsx` existed. Output:

```
FAIL src/screens/__tests__/AddVehicleSheet.test.tsx
  ● Test suite failed to run

    Cannot find module '../AddVehicleSheet' from 'src/screens/__tests__/AddVehicleSheet.test.tsx'

Test Suites: 1 failed, 1 total
Tests:       0 total
```

### GREEN

Implemented `src/screens/AddVehicleSheet.tsx` verbatim from brief Step 3.

Command: `npm test -- AddVehicleSheet`

```
PASS src/screens/__tests__/AddVehicleSheet.test.tsx
  AddVehicleSheet
    √ flashes when submitting an empty VIN (187 ms)
    √ sample VIN chip fills the field and shows the decoded preview (280 ms)
    √ typing a VIN and submitting adds the vehicle and closes (101 ms)
    √ scan chip flashes the not-wired message; info opens VIN help (28 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

(Jest prints an unrelated "did not exit one second after..." warning common
to this suite; not a failure.)

## Full-suite and typecheck output

Command: `npm test` (full suite)

```
Test Suites: 2 failed, 19 passed, 21 total
Tests:       105 passed, 105 total
```

The 2 failing suites are **not mine**:

- `src/screens/__tests__/SplashStub.test.tsx` — `Cannot find module
  '../SplashStub'` (another implementer's file, mid-write).
- `src/screens/__tests__/RecallSheet.test.tsx` — `Cannot find module
  '../RecallSheet'` (another implementer's file, mid-write).

`src/screens/__tests__/AddVehicleSheet.test.tsx` is in the PASS list (4/4).
All 105 collected tests across the repo pass; the 2 failures are suite-load
failures for files outside my scope, per the task instructions ("if the
full `npm test` ... shows failures in files that are not yours ... note
them ... do not fix them").

Command: `npm run typecheck`

```
src/screens/__tests__/RecallSheet.test.tsx:2:29 - error TS2307: Cannot find module '../RecallSheet' or its corresponding type declarations.

Found 1 error in src/screens/__tests__/RecallSheet.test.tsx:2
```

Only one typecheck error, in `RecallSheet.test.tsx` — not my file. No
errors attributable to `AddVehicleSheet.tsx` or its test. (By the time
typecheck ran, `SplashStub.tsx` had apparently landed from the concurrent
task, since it no longer errors — consistent with concurrent implementers
finishing mid-session.)

Re-ran once as instructed; same result both times (RecallSheet is the only
other-file failure by the second pass).

## Deviations from the brief

1. **Step 4 (mount into `OverlayHost.tsx`) skipped entirely**, per the
   explicit exception in the task instructions: three other overlay screens
   are being built concurrently and the controller mounts all four together
   afterward in the fixed z-order. `OverlayHost.tsx` was not opened or
   edited.
2. **Step 6 (emulator verification) skipped** — no emulator available this
   session. Deferred; listed as a follow-up for whoever runs
   emulator/screenshot verification later (compare `t18-sheet-empty.png` vs
   `sheet-add-empty.png`, `t18-sheet-sample.png` vs `sheet-add-sample.png`,
   `t18-added.png` vs `garage-added-toast.png`).
3. **Step 7 (git checkpoint "feat: add-vehicle sheet") skipped** — no
   commits (git hold). No repository exists and none was created.

No other deviations. Step 3's code was implemented character-for-character
as given in the brief (this also matches what a direct read of `addSheet()`
in `GaragePrototype.dc.html` would have produced independently — copy
strings, colors, and structure all line up).

## Self-review

- **Completeness**: all four test cases from the brief implemented and
  passing; component covers empty-VIN flash, sample-VIN chip + decoded
  preview, valid-VIN submit + close, scan chip flash, and info button →
  VIN help navigation while leaving `sheet` at `'add'`.
- **Verbatim values**: confirmed copy strings match `GaragePrototype.dc.html`
  `addSheet()` byte-for-byte, including the U+00B7 middle dot in `"ENTER
  VIN · 17 CHARACTERS"` (verified via a codepoint dump, not just eyeballing).
- **No extra features**: implementation is exactly the brief's Step 3 code;
  no additions, no styling changes, no extra props.
- **No files outside scope**: only `src/screens/AddVehicleSheet.tsx` and
  `src/screens/__tests__/AddVehicleSheet.test.tsx` were created; nothing
  else touched, `OverlayHost.tsx` untouched as instructed.
- Used `StyleSheet`/`absoluteFill` note from the session brief does not
  apply here — `AddVehicleSheet.tsx` doesn't use `absoluteFillObject`
  directly (that's inside `Sheet.tsx`, already correct and out of scope).

## Concerns

None. The two other-file failures are expected concurrent-task noise per
the controller's own instructions and require no action from this task.
