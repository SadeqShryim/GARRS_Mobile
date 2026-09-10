# Task 6 report — Recalls tab, recall card, recall detail, routes

**Status: DONE**

## Files created
- `src/screens/recalls/RecallCard.tsx`
- `src/screens/recalls/RecallsScreen.tsx`
- `src/screens/recalls/RecallDetailScreen.tsx`
- `src/screens/recalls/__tests__/recalls.test.tsx`
- `app/(tabs)/recalls/_layout.tsx`
- `app/(tabs)/recalls/index.tsx`
- `app/(tabs)/recalls/[id].tsx`

## Files deleted
- `app/(tabs)/recalls.tsx` (replaced by the `recalls/` route directory)

## Files modified
- `src/ui/HumpTabBar.tsx` — one line: the tab-item `onPress` now also resets the recalls stack to its `index` route on tab tap (`t.id === 'garage' || t.id === 'recalls'`).
- `app/(tabs)/garage/[id].tsx` — replaced whole file per brief: stats "Details" now calls `showRecall('v' + id)` then `router.navigate('/(tabs)/recalls')` instead of `switchTab('recalls')`.
- `src/ui/__tests__/HumpTabBar.test.tsx` — one assertion (see Deviations).

All code was transcribed verbatim from the brief; no other changes to logic.

## Test output
- `npm test -- recalls`: **2 suites / 12 tests passed** (RecallSheet.test.tsx pre-existing + the new recalls.test.tsx, both green).
- `npm test -- OverlayHost`: **1 suite / 4 tests passed.**
- `npm test -- VehicleStats`: **1 suite / 4 tests passed.**
- Full `npm test`: **246/247 tests passed, 42/43 suites passed.** The one failure, `src/screens/hub/__tests__/ArticleReader.test.tsx` (a swipe-past-70px assertion mismatch, `a3` expected vs `a2` received), is in another implementer's concurrently-edited territory (`src/screens/hub/`) per the brief's explicit list of files other agents are touching — untouched, reported only.
- `npm run typecheck`: **0 errors.** (One transient run mid-session showed 2 errors in `src/screens/recalls/RecallsScreen.tsx` and `src/screens/service/ReasonSheet.tsx` for the `/(tabs)/recalls/[id]` route literal, caused by the auto-generated `.expo/types/router.d.ts` being regenerated concurrently — likely by another process in this multi-agent session. A re-run immediately after was clean with no source changes; confirmed stable across two subsequent full runs.)

## Deviations
- Updated one assertion in `src/ui/__tests__/HumpTabBar.test.tsx` (not in this task's file list) from `expect(p.navigation.navigate).toHaveBeenCalledWith('recalls', undefined)` to `...toHaveBeenCalledWith('recalls', { screen: 'index' })`. This test is the direct, pre-existing companion test for the one-line change the brief instructed in `src/ui/HumpTabBar.tsx` (Step 5); making that change correctly, as instructed, made the old assertion (encoding the *previous* behavior) fail. This is the smallest possible fix and only updates the expected value to match the new, correct, brief-specified behavior — no other assertions or test structure touched.

## Deferred steps
None — all 8 steps in the brief completed.

## Concerns
- None regarding my own files. The `ArticleReader.test.tsx` failure and the transient router.d.ts typecheck race are both artifacts of concurrent work by other implementers on the same tree during this session, not of Task 6's files.
