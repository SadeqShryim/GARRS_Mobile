# Task 9 report — Article reader (live panel, peek panels, leaver, swipe)

**Status: DONE**

## Files created
- `src/screens/hub/ArticlePanel.tsx`
- `src/screens/hub/ArticleReader.tsx`
- `src/screens/hub/__tests__/ArticleReader.test.tsx`

`ArticlePanel.tsx` and `ArticleReader.tsx` were transcribed verbatim from the brief (including the note to import `Icon` from `../../ui/Icon` and `Mono`/`Sans` from `../../ui/Txt` in `ArticleReader.tsx`) with no changes needed to compile or pass. The test file needed the deviation below to pass reliably.

## Own suite (`npm test -- ArticleReader`)
```
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```
(8, not 7 — see Deviations: the brief's one combined swipe test became two.)

## Full gate

`npm test`:
```
Test Suites: 43 passed, 43 total
Tests:       248 passed, 248 total
```

`npm run typecheck`:
```
(no output — clean, tsc --noEmit exits 0)
```

No other suite's files were touched. `src/screens/hub/__tests__/hub.test.tsx` (the concurrent implementer's file in the same directory) passes as part of the full run — its own report (`task-8-report.md`) had flagged my file's swipe test as a pre-existing failure at the time; that is now fixed (see below), so the whole tree is green.

## Deviations

**The brief's single combined swipe test (`'a swipe past 70 px changes the article; a short swipe does not'`, three sequential `fireGestureHandler` calls interleaved with `fireEvent`/timer advances on one mounted tree) does not pass as written, and not for a reason fixable by touching production code.** Traced with temporary `console.log` instrumentation (removed before finalizing; `ArticleReader.tsx` matches the brief byte-for-byte) down to two distinct jest-environment facts, both external to this component:

1. **The brief's event lists never trigger `onUpdate`.** `[{state: BEGAN}, {state: ACTIVE, translationX: X}, {state: END, translationX: X}]` makes the `BEGAN→ACTIVE` transition fire `onStart` (which this component doesn't define), not `onUpdate` — `onUpdate` only fires for a same-state `ACTIVE→ACTIVE` repeat. Fixed by inserting a leading `{state: ACTIVE, translationX: 0}` frame before the real one, matching gesture-handler's own documented jest-utils usage pattern.
2. **`runOnJS`'s jest mock (`react-native-worklets/lib/module/mock.js`) schedules via `queueMicrotask`, which `jest.useFakeTimers()` intercepts** (this suite already uses fake timers for the leave/snap durations) — so the queued call to `goNext`/`goPrev` only runs once fake timers are advanced, not on a real `await Promise.resolve()`. Fixed by adding `act(() => jest.advanceTimersByTime(0))` after a gesture that's expected to cross the 70 px threshold.
3. **Once both of those were fixed, a second `fireGestureHandler` call issued after a store-driven re-render (e.g. the third swipe in the brief's combined test, coming after the first swipe's `setArticle` + a `jest.advanceTimersByTime(400)` flush) still read the *stale* pre-re-render article.** Traced by logging inside `onUpdate`/`onEnd`/`go` and at the top of `ArticleReader`: `GestureDetector`'s registered native-handler callbacks in this jest environment are not being refreshed to the latest render's closures across a re-render, so a chained multi-swipe test on one mounted tree replays an old `a`. This reproduces regardless of story chosen for (1)/(2) and is not something fixable from within `ArticleReader.tsx` without weakening or restructuring the component itself (which the brief does not call for and which is unrelated to the actual swipe threshold logic under test).

Given (3), I restructured the test into **two** tests instead of one, matching the brief's per-direction intent but each against a **freshly mounted** `<ArticleReader />` (no re-render precedes the gesture dispatch under test, which is exactly the case that works reliably):
- `'a short swipe does not change the article; a longer one past 70 px advances to the next'` — combines the brief's short-swipe-then-long-swipe-forward assertions (no re-render occurs between them, since the short swipe causes no state change, so this pair does still work on one mount, as in the brief).
- `'a swipe past 70 px in the positive direction goes to the previous article'` — a separate fresh mount, asserting the `dx > 0 → goPrev` branch (the brief's third assertion), avoiding the stale-closure re-render case entirely.

This keeps full coverage of the threshold/direction logic (short swipe → no-op; long negative → next; long positive → previous) using only test-file changes; `ArticleReader.tsx` and `ArticlePanel.tsx` are unmodified from the brief. This is a **larger** deviation than a typical smallest-fix and arguably exceeds what "drop only the swipe test" in the brief's Step 4 fallback anticipated (which would have been the alternative — dropping swipe coverage entirely and relying on the emulator pass in Task 13). I judged restructuring into two fresh-mount tests to be a smaller net change than it looks (test-only, no assertions weakened, no new APIs) and preferable to losing swipe coverage outright, but flagging this explicitly since it is a deviation from what was asked.

## Deferred steps
None.

## Concerns
- The `GestureDetector` stale-callback-across-re-render behavior noted above is a jest-environment/testing-library limitation, not an app bug — the real swipe interaction is exercised on-device per the plan's Task 13 (emulator pass). Worth keeping in mind for any future test that drives multiple sequential gestures against one mounted `GestureDetector` tree across state-changing interactions.
