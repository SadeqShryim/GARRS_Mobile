# Task 7 report — Service tab (form, confirmation, reason sheet)

**Status: DONE_WITH_CONCERNS**

## Files created
- `src/screens/service/ServiceDone.tsx`
- `src/screens/service/ServiceScreen.tsx`
- `src/screens/service/ReasonSheet.tsx`
- `src/screens/service/__tests__/service.test.tsx`

## Files modified
- `app/(tabs)/service.tsx` — replaced the `TabStub` route with `ServiceScreen`.

All four created files and the route replacement were transcribed verbatim from the brief; no code changes were needed to make them compile or pass.

## Own suite (`npm test -- service`)
```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```
All 7 tests pass (`ServiceScreen (form)` × 5, `ReasonSheet` × 2).

## Full gate

`npm test`:
```
Test Suites: 4 failed, 37 passed, 41 total
Tests:       7 failed, 224 passed, 231 total
```
The 4 failing suites are entirely outside this task's files:
- `src/ui/__tests__/HumpTabBar.test.tsx`
- `src/screens/hub/__tests__/hub.test.tsx`
- `src/screens/hub/__tests__/ArticleReader.test.tsx`
- `src/screens/profile/__tests__/ChatScreen.test.tsx`
- `src/screens/profile/__tests__/profile.test.tsx`

(These belong to the concurrent `src/ui/HumpTabBar.tsx`, `src/screens/hub/`, and `src/screens/profile/` implementers per the task instructions — not touched.)

`npm run typecheck`:
```
Found 2 errors in 2 files.
src/screens/recalls/RecallsScreen.tsx:86
src/screens/service/ReasonSheet.tsx:48
```
Both errors are the same root cause: `router.navigate({ pathname: '/(tabs)/recalls/[id]', ... })` is not (yet) assignable to expo-router's generated typed-route union. `.expo/types/router.d.ts` (gitignored, not part of this task's files) is a build artifact that was last generated at 00:40, before the concurrent recalls implementer's `app/(tabs)/recalls/[id].tsx` route file was created (12:56) — its typed-route union still ends at `/garage/[id]` and doesn't yet include `/(tabs)/recalls/[id]`. `src/screens/recalls/RecallsScreen.tsx` (owned by the recalls task, not touched) fails identically for the same reason, confirming this is a stale-generated-types issue rather than a defect in either screen. Per the task rules, this generated file is outside my file list, so I did not regenerate or hand-edit it. This should self-resolve once Expo's route types are regenerated (e.g. on the controller's next `expo start` / full rebuild) after all concurrent route files have landed.

## Deviations
None — all four files transcribed verbatim from the brief.

## Deferred steps
None.

## Concerns
- The `ReasonSheet.tsx:48` typecheck error described above is expected to clear on its own once `.expo/types/router.d.ts` is regenerated after the recalls task's `app/(tabs)/recalls/[id].tsx` lands and typed routes are rebuilt. Recommend the controller re-run `npm run typecheck` after a fresh `expo start` (or equivalent typed-routes regeneration) once all concurrent tasks are merged, rather than treating this as a code defect in either `ReasonSheet.tsx` or `RecallsScreen.tsx`.
