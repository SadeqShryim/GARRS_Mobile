# Task 5 report — Slice 3 (app tabs)

## Status

DONE

## Files created/modified

Created:
- `src/ui/useTilt.ts`
- `src/ui/TiltMap.tsx`
- `src/ui/__tests__/TiltMap.test.tsx`

No other files touched. `src/store/useAppStore.ts` and its test (owned by the concurrent implementer) were not modified and were not opened.

All three files were transcribed verbatim from `task-5-brief.md` — no deviations were needed. Everything the brief assumes as already present was confirmed present before writing: `SERVICE_COPY.live`/`liveTilt`, `SVC_CENTER` in `src/fixtures/service.ts`; `RAD_TO_DEG`, `Tilt`, `tiltChanged`, `tiltFor` in `src/lib/service.ts`; `color.mapInk/mapInk2/mapInk3/mapTint/hair10/sunken/surface/ink/ink3/ink5/blueDeep/teal` and `dur.tilt` in `src/theme/tokens.ts`; `Icon`, `Sans`/`Mono` in `src/ui/Icon.tsx` / `src/ui/Txt.tsx`; the `expo-sensors` `DeviceMotion` jest mock already in `jest.setup.ts` (matches the test's expected shape exactly: `isAvailableAsync`, `requestPermissionsAsync`, `setUpdateInterval`, `addListener`).

## Test and typecheck summary

- `npm test -- TiltMap`: **1 suite passed, 2 tests passed** (0 failed)
- `npm test` (full): **37 suites passed, 206 tests passed** (0 failed)
- `npm run typecheck`: **clean, 0 errors**

## Deviations

None. The brief's permitted fallback (`filter: 'drop-shadow(...)'` string form in `TiltMap.tsx`'s `pin` style) was not needed — the array form `filter: [{ dropShadow: '0 0 10px rgba(15,99,143,0.45)' }]` type-checked as written against the installed RN 0.86 style types.

## Deferred steps

None.

## Concerns

None. The full-tree gate (`npm test && npm run typecheck`) is clean, including files outside this task's scope. The only pre-existing console noise in the full run is `act(...)` warnings from `src/overlays/__tests__/OverlayHost.test.tsx` (unrelated to this task, tests still pass).
