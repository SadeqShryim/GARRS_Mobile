# Task 10 report — Profile tab, membership screen, plan cards

**Status:** DONE

## Files created

- `src/screens/profile/ProfileScreen.tsx`
- `src/screens/profile/MembershipScreen.tsx`
- `src/screens/profile/PlanCard.tsx`
- `src/screens/profile/__tests__/profile.test.tsx`

## Files modified

- `src/ui/SlideUpScreen.tsx` — added the optional `gap` prop (default 20), applied to the `ScrollView`'s `contentContainerStyle`. `VinHelpScreen.tsx` doesn't pass `gap`, so it keeps its existing 20px spacing unchanged.
- `app/(tabs)/profile.tsx` — replaced the `TabStub` route with `ProfileScreen`.

## Gate

- `npm test -- profile`: **7/7 passed** (`profile.test.tsx` — `ProfileScreen` and `MembershipScreen` suites), after the deviation below.
- `npm test -- VinHelp`: **4/4 passed** — confirms the `SlideUpScreen` `gap` change didn't disturb the existing VIN-help screen.
- Full `npm test`: **245/249 passed, 4 failed**, across **43/45 suites passed, 2 failed**. `profile.test.tsx` and `ChatScreen.test.tsx` are both among the passing suites. All 4 failures are in another implementer's files, not mine:
  - `src/screens/hub/__tests__/hub.test.tsx` (3 failures — duplicate "ABS" text lookups and an auto-advance timer count)
  - `src/screens/hub/__tests__/ArticleReader.test.tsx` (1 failure — swipe-gesture article index)
  - Per the task rules (`src/screens/hub/` is another implementer's territory), these were left untouched.
- `npm run typecheck`: **2 errors**, both in other implementers' files, neither touching mine:
  - `src/screens/recalls/RecallsScreen.tsx:86` — `router.navigate` pathname literal `/(tabs)/recalls/[id]` not in the route union
  - `src/screens/service/ReasonSheet.tsx:48` — same pathname literal issue
  - Left untouched per the task rules.

## Deviations

- **`profile.test.tsx`, first `ProfileScreen` test:** the brief's code asserted `expect(getByText('All Clear')).toBeTruthy();` (singular query). `SEED_VEHICLES` (`src/fixtures/vehicles.ts`, out of this task's scope, unchanged since the initial commit) seeds 3 vehicles where only vehicle 1 (`Model S Plaid`) carries an open recall; vehicles 2 (`Taycan 4S`) and 3 (`Civic Type R`) both have `recall: null` and so both already render "All Clear" pre-schedule — matching the design's `profileVals()` (`GaragePrototype.dc.html:1702-1713`, `status: open ? '1 Active Recall' : 'All Clear'`, evaluated per vehicle). RTL's `getByText` throws on multiple matches, so the literal transcription fails against `ProfileScreen`'s (correct, design-faithful) output.
  - Fix: destructured `getAllByText` alongside `getByText` in that test's `render(...)` call, and changed the assertion to `expect(getAllByText('All Clear').length).toBeGreaterThan(0);`. The final test in the same suite (`the garage rows go clear once scheduled`) already used `getAllByText('All Clear')).toHaveLength(3)` and needed no change.
  - No other lines changed; `ProfileScreen.tsx`, `MembershipScreen.tsx`, `PlanCard.tsx`, `app/(tabs)/profile.tsx`, and the `SlideUpScreen.tsx` two-line `gap` addition are all verbatim from the brief.

## Deferred steps

None — all files listed under **Files** are complete and gated.

## Concerns

- None for this task's own files. The full-tree gate failures listed above (hub, ArticleReader, recalls, service) belong to concurrently-edited files outside this task's scope and are reported here only as required by the brief's rules, not addressed.
