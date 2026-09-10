# Task 6 report — Auth panel

**Status: DONE**

## Files created
- `src/screens/splash/AuthPanel.tsx`
- `src/screens/splash/__tests__/AuthPanel.test.tsx`

No other files were touched. `.superpowers/sdd/2026-09-09-slice2-splash/progress.md` and `scripts/emu-splash-shots.mjs` showed as changed/untracked in `git status` at the time of this report but were not modified by this task — they belong to the parallel Task 8 work / the controller.

## Test output
`npm test -- AuthPanel`: **7/7 passed**, 1 suite.

Full gate `npm test`: **167/167 passed, 33/33 suites** (includes Task 7's and Task 8's already-landed files — `layers.test.tsx`, `useSplashTimeline.test.tsx`, `GarageScreen.test.tsx`, `VehicleStatsScreen.test.tsx`, `RecallSheet.test.tsx`, `OverlayHost.test.tsx`, etc. — all green). `OverlayHost.test.tsx` prints pre-existing "not wrapped in act(...)" console warnings; these are not failures and are unrelated to this task's files (confirmed pre-existing, not introduced here).

`npm run typecheck`: **clean, exit 0, no output.** The brief's anticipated `filter`-inside-`useAnimatedStyle` typing problem did not occur — `StepIn`'s `useAnimatedStyle` (with the `filter: [{ blur: ... }]` entry) type-checked as written, with no cast or explicit `useAnimatedStyle<ViewStyle>` annotation needed.

## Deviations from the brief
1. **Test file only — one line wrapped in `act()`, plus its `import` line.** The brief's last test ("hardware back steps backwards while a later step is showing") calls the mocked `BackHandler` handler directly (`handlers[handlers.length - 1]()`) and asserts on the rendered text immediately afterward. Under the installed React 19 / `react-test-renderer` combination, a `useReducer` dispatch triggered from a plain function call outside of RNTL's own event helpers (`fireEvent`) is scheduled at Default priority and is not reflected in the tree until a macrotask tick or an explicit `act()` flush — confirmed empirically with an isolated scratch reproduction (a bare `useReducer` counter dispatched the same way, outside any of `AuthPanel`'s code), which failed identically and only passed once wrapped in `act()` (from either `react-test-renderer` or `@testing-library/react-native`) or given a `setTimeout(…, 0)` tick; a `Promise.resolve()` microtask was not sufficient. This is an environment fact, not a bug in `back()`/`reduce()` (verified: `back(s)` correctly returns `{ ...s, step: 'email' }` for the `pw` case).
   - Fix applied only in `AuthPanel.test.tsx`: added `act` to the `@testing-library/react-native` import, and changed
     ```ts
     expect(handlers[handlers.length - 1]()).toBe(true);
     ```
     to
     ```ts
     let backResult: boolean | null | undefined;
     act(() => { backResult = handlers[handlers.length - 1](); });
     expect(backResult).toBe(true);
     ```
     preserving the original return-value assertion. No other line of the test changed.
   - `AuthPanel.tsx` itself required no deviation and is transcribed verbatim from the brief, comments included.
2. No `useAnimatedStyle<ViewStyle>` cast was needed (see typecheck note above) — the brief's fallback instruction did not have to be exercised.

## Deferred steps
- Step 5 (git checkpoint commit) was **not** performed per the brief's own rules for this task ("Do not run git") and the environment's Rules section — no commit was made. Ready for the controller to commit when it runs its own gate.

## Concerns
None functionally. Flagging for the controller/reviewer only: the one test-file deviation above (`act()` wrapping) is a testing-environment necessity under React 19 for any future test in this codebase that invokes a mocked native-event handler (e.g. another `BackHandler` listener) directly and then asserts on rendered text in the same synchronous block — `OverlayHost.test.tsx`'s equivalent tests avoid the issue only because they assert against the Zustand store's `getState()` directly rather than the rendered DOM.
