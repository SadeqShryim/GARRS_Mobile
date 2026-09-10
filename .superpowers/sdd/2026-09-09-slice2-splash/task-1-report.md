# Task 1 report — Skia jest mock, Instrument Serif, splash tokens

**Status: DONE**

## Files

Modified:
- `jest.setup.ts` — appended the `@shopify/react-native-skia` jest mock (verbatim from brief Step 3), after the existing `expo-linear-gradient` mock.
- `src/theme/tokens.ts` — replaced `color`, `font`, `ease` with the Slice 2 versions (verbatim from brief Step 4); `bez`, `dur`, `blur`, `layout` left untouched.
- `src/ui/Txt.tsx` — whole file replaced to add `Serif` alongside `Sans`/`Mono` (verbatim from brief Step 5).
- `app/_layout.tsx` — added the `InstrumentSerif_400Regular` import and included it in the `useFonts({ … })` call, after `GeistMono_500Medium` (verbatim from brief Step 6). Nothing else in the file changed.

Created:
- `src/ui/__tests__/Serif.test.tsx` (verbatim from brief Step 1)
- `src/__tests__/skia-mock.test.tsx` (verbatim from brief Step 1)

## Test / typecheck output

- Step 2 (pre-mock, expected FAIL): `npm test -- Serif skia-mock` → 2 suites failed, 1/2 tests failed — `skia-mock.test.tsx` failed to parse (`Cannot use import statement outside a module` from the real `@shopify/react-native-skia` ESM build) and `Serif.test.tsx` failed with `Element type is invalid` (no `Serif` export yet). Matches the brief's expected failure.
- Step 7, targeted suites after the change: `npm test -- Serif skia-mock` → **Test Suites: 2 passed, 2 total. Tests: 2 passed, 2 total.**
- Full gate: `npm test` → **Test Suites: 28 passed, 28 total. Tests: 145 passed, 145 total.** (This includes the files already landed in the repo working tree by the parallel Tasks 2–4 — e.g. `src/fixtures/splash.ts`, `src/screens/splash/`, `src/assets/__tests__/splash-assets.test.ts` — all green together with this task's changes.) Console showed pre-existing `act(...)` warnings from `src/overlays/__tests__/OverlayHost.test.tsx`, unrelated to this task's files, and a "worker process has failed to exit gracefully" notice from jest-expo teardown — neither is a failure and neither is new.
- `npm run typecheck` → **exit 0, no output** (clean).

## Deviations from the brief

None. All code was transcribed verbatim from the brief and compiled/passed on the first attempt; no minimal-deviation fixes were needed.

## Deferred steps

- Step 8 ("Checkpoint" — `git commit -m "chore: skia jest mock, Instrument Serif, splash tokens"`) was **not run**, per this task's explicit rule "Do not run git." No git commands were executed at any point.

## Concerns

None. `@shopify/react-native-skia` and `@expo-google-fonts/instrument-serif` were already present in `node_modules`/`package.json` as the brief stated, so no install was needed. Did not touch `scripts/bake-assets.mjs`, `src/assets/*`, `src/fixtures/splash.ts`, `src/screens/splash/timeline.ts`, or `src/screens/splash/auth.ts` — those belong to the parallel Tasks 2–4, all of which appear to already be present and passing in the full-tree run.
