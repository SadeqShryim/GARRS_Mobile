# Task 8 report — Hub tab (article rail, dots, light filter, light grid, light sheet)

**Status: DONE**

## Files created
- `src/screens/hub/ArticleCard.tsx`
- `src/screens/hub/HubScreen.tsx`
- `src/screens/hub/LightSheet.tsx`
- `src/screens/hub/__tests__/hub.test.tsx`

## Files modified
- `app/(tabs)/hub.tsx` — replaced the `TabStub` route with `HubScreen`.

`ArticleCard.tsx`, `HubScreen.tsx`, `LightSheet.tsx`, and the route were transcribed verbatim from the brief with no changes needed to compile or pass. The test file needed the deviations below to pass.

## Own suite (`npm test -- hub`, restricted to `hub.test.tsx`)
```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```
All 7 tests pass (`HubScreen` × 4, `LightSheet` × 3). Note: `npm test -- hub` also picks up the concurrent implementer's `src/screens/hub/__tests__/ArticleReader.test.tsx` (same directory, matches the `hub` pattern) — that suite has 1 pre-existing failure unrelated to my files (see Full gate below); it is not touched.

## Full gate

`npm test`:
```
Test Suites: 1 failed, 42 passed, 43 total
Tests:       1 failed, 246 passed, 247 total
```
The single failure is `src/screens/hub/__tests__/ArticleReader.test.tsx` ("a swipe past 70 px changes the article; a short swipe does not" — expected `article` to be `'a3'`, received `'a2'`). That file belongs to the concurrent implementer building `src/screens/hub/ArticleReader.tsx` / `ArticlePanel.tsx` in the same directory — per the task rules I did not touch it or investigate further, just confirmed it isn't affected by anything in my four files.

`npm run typecheck`:
```
(no output — clean, tsc --noEmit exits 0)
```

## Deviations
Both are confined to `src/screens/hub/__tests__/hub.test.tsx` (test file only; the three component files and the route match the brief exactly):

1. **`getByText('ABS')` → `getAllByText('ABS').length`.** Light `l8` (from the already-existing `src/fixtures/lights.ts`, not mine to touch) has `short: 'ABS'` and `glyph: 'ABS'` — verified against `GaragePrototype.dc.html:1091`, this is the design's own data (the ABS light's caption and its letter-glyph are the same word). Rendering both the tile's glyph and its caption, plus `LightSheet`'s title and glyph, literally emits the string `"ABS"` twice in each screen, so a singular `getByText('ABS')` throws "Found multiple elements with text: ABS" — not a code defect, just a query that can't disambiguate two design-faithful duplicate text nodes. Changed the two `getByText('ABS')` assertions (one in `HubScreen`'s first test, one in `LightSheet`'s "shows the warning and status badges" test) to `getAllByText('ABS').length).toBeGreaterThan(0)`, and added `getAllByText` to the relevant destructures. No production code was changed for this.
2. **Wrapped store mutations that precede a fake-timer advance or a `rerender` in `act(...)`.** The brief's auto-advance test called `useAppStore.getState().openLight('l1')` directly, then `jest.advanceTimersByTime(5000)`, expecting the pause to take effect immediately. Without `act()`, React (RN's test renderer, React 18 semantics) doesn't guarantee the store-triggered re-render (which updates `pausedRef.current`) flushes before the timer fires, so the interval still saw the stale `paused === false` and called `advance()` a second time (test failed: expected 1 call, got 2). This matches the established convention already used elsewhere in this codebase for the same pattern (e.g. `src/screens/profile/__tests__/ChatScreen.test.tsx` wraps every `jest.advanceTimersByTime` in `act(...)`). Fixed by: importing `act` from `@testing-library/react-native`, wrapping both `jest.advanceTimersByTime(5000)` calls and the `openLight('l1')` call in `act(...)`, and (for tidiness, to silence a benign act-warning) wrapping the `s().openLight('l17')` call before the `rerender(<LightSheet />)` in the third `LightSheet` test the same way. No production code was changed for this.

## Deferred steps
None.

## Concerns
- A residual `console.error` act-warning appears during the full run, originating from `VirtualizedList`'s internal `_updateCellsToRender` debounce timer firing outside the synchronous test flow when `InfiniteRail`'s underlying `FlatList` is exercised under fake timers. This is a pre-existing artifact of the shared `InfiniteRail` primitive (also used by `src/screens/garage/Rail.tsx` and covered by `src/ui/__tests__/slice3-primitives.test.tsx`), not something introduced by `HubScreen`. It does not fail any test and needed no fix.
- `src/screens/hub/__tests__/ArticleReader.test.tsx` has one pre-existing failure (see Full gate). It is entirely within the concurrent implementer's files (`ArticleReader.tsx` / `ArticlePanel.tsx` / that test file) — flagged per the task rules, not investigated or touched.
