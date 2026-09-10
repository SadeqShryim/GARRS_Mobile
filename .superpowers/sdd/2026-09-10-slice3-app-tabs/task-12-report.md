# Task 12 report — Overlay host integration, hardware back order, stub removal

**Status:** DONE

## Files

- Modified: `src/overlays/OverlayHost.tsx` — replaced whole file with the brief's Step 1 code verbatim (all overlays mounted in source z-order; hardware back closes article → screen → hubLight → sheet, falling through to the navigator when nothing is open).
- Modified: `src/overlays/__tests__/OverlayHost.test.tsx` — replaced whole file with the brief's Step 2 code verbatim (uses the global `expo-router` mock from `jest.setup.ts`, mocks `useMarqueeDrive`, fake timers).
- Deleted: `src/screens/TabStub.tsx`
- Deleted: `src/screens/__tests__/TabStub.test.tsx`

## Pre-delete confirmation

Grepped the repo for `TabStub` before deleting. Only hits were the two files themselves plus prose mentions in plan/spec/report markdown (`docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`, `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md`, and earlier task reports). No route or source file imports `TabStub`, confirming the brief's note that Tasks 6, 7, 8, 10 already replaced the stub routes. Proceeded with deletion.

## Gate output

`npx jest OverlayHost`:
```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```
(Console showed React "not wrapped in act(...)" warnings from `closeLight`/`closeSheet` calls inside the test's `pressBack()` helper — these are warnings only, not failures, and come from the brief's test code transcribed verbatim.)

`npm test` (full suite):
```
Test Suites: 42 passed, 42 total
Tests:       250 passed, 250 total
```
(No `TabStub` suite remains, as expected after deletion.)

`npm run typecheck`:
```
tsc --noEmit
```
Clean — no errors, no output.

## Deviations

None. All code transcribed verbatim from the brief.

## Deferred steps

None — all four steps in the brief completed.

## Concerns

- The act() warnings noted above are pre-existing in the brief's test code (present because `BackHandler.addEventListener` is mocked directly rather than going through RTL's `fireEvent`); they do not affect pass/fail and were left as transcribed per the "transcribe verbatim" rule.
