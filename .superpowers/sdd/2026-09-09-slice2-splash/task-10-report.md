# Task 10 report — Compose `Splash`, swap it into `OverlayHost`, delete the stub

**Status: DONE**

## Files created
- `src/screens/splash/Splash.tsx` — transcribed verbatim from the brief.
- `src/screens/splash/__tests__/Splash.test.tsx` — transcribed verbatim from the brief.

## Files modified
- `src/overlays/OverlayHost.tsx` — replaced `import { SplashStub } from '../screens/SplashStub';` with `import { Splash } from '../screens/splash/Splash';`, and `{splash && <SplashStub onDone={dismissSplash} />}` with `{splash && <Splash onDone={dismissSplash} />}`. The header comment already read "… Toast, Splash" (added in a prior task's edit), so it needed no change — left as-is. Nothing else in the file changed.
- `src/overlays/__tests__/OverlayHost.test.tsx` — added `jest.mock('../../screens/splash/useMarqueeDrive');` next to the existing `jest.mock('expo-router', …)`, and appended the new `it('mounts the real Splash while splash is true', …)` test inside the existing `describe('OverlayHost hardware back', …)` block, exactly as given in the brief.

## Files deleted (plain `rm`, not git)
- `src/screens/SplashStub.tsx`
- `src/screens/__tests__/SplashStub.test.tsx`

Confirmed no remaining references to `SplashStub` anywhere under `src/`.

## Sequence followed
1. Wrote the two failing tests (Step 1).
2. `npm test -- Splash OverlayHost` → FAIL as expected: `Splash.test.tsx` failed to resolve `../Splash` (module didn't exist yet); `OverlayHost.test.tsx`'s new test failed with "Unable to find an element with testID: stage" because `OverlayHost` still mounted `SplashStub` (Step 2, confirmed red).
3. Wrote `src/screens/splash/Splash.tsx` verbatim (Step 3).
4. Swapped the import/usage in `OverlayHost.tsx` (Step 4).
5. Deleted the stub files with `rm` (Step 5).
6. Ran the full gate (Step 6, below) — all green.

## Test output
`npm test -- Splash OverlayHost`:
```
Test Suites: 10 passed, 10 total
Tests:       54 passed, 54 total
```
(Pre-existing `console.error` "not wrapped in act(...)" warnings appear from the *existing* hardware-back tests in `OverlayHost.test.tsx` — `pressBack()` calling `closeSheet`/`closeVinHelp` directly outside `act()`. These are unrelated to Task 10's changes: they come from `it` blocks written in earlier tasks, not touched here, and the suite still reports all tests passing.)

Full gate — `npm test`:
```
Test Suites: 33 passed, 33 total
Tests:       168 passed, 168 total
```
(One unrelated Jest infra warning: "A worker process has failed to exit gracefully… Active timers can also cause this" — a known jest-expo/fake-timer artifact from the wider suite, not a test failure; exit code 0, all suites/tests green.)

`npm run typecheck`:
```
> tsc --noEmit
```
No errors, exit code 0.

## Deviations from the brief
None. `Splash.tsx` and both test files were transcribed exactly as given. The new `Splash.test.tsx` did not need any extra `act()` wrapping beyond what the brief already specified (the brief's `fireEvent.press` calls needed no additional `act()` — the test passed on the first run with the code as transcribed).

## Deferred steps
- Step 7 ("Checkpoint — 'feat: real Splash replaces the stub'") is a git commit; per this task's rules ("do not run git") that step is left for the controller.

## Concerns
- Two files unrelated to this task appear as pending changes in the working tree (not created or touched by this implementer): `scripts/emu-splash-shots.mjs` (untracked) and `.superpowers/sdd/2026-09-09-slice2-splash/progress.md` (modified). Flagging so the controller doesn't mistake them for part of this task's diff when committing.
- No other concerns; the port is a straight, mechanical wire-up — every module `Splash.tsx` imports already existed from Tasks 1–9 with matching signatures.
