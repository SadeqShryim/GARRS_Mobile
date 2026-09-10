# Task 7 report — Mark, Blobs, Bubble (RN layers)

**Status: DONE**

## Files created

- `src/screens/splash/Mark.tsx`
- `src/screens/splash/Blobs.tsx`
- `src/screens/splash/Bubble.tsx`
- `src/screens/splash/__tests__/layers.test.tsx`

All four transcribed verbatim from the brief (comments included). No other files were touched.

## Test output

Own suite first:

```
npm test -- layers
PASS src/screens/splash/__tests__/layers.test.tsx
  ✓ Mark shows the shield tile and RECALL HUB
  ✓ Blobs draws four blobs under the scrim
  Bubble
    ✓ shows the copy and reports its frame for the Skia backdrop
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Full gate:

```
npm test
Test Suites: 1 failed, 29 passed, 30 total
Tests:       1 failed, 153 passed, 154 total
```

The one failure is `src/screens/splash/__tests__/glass.test.tsx` → `GoogleMark renders the four-colour G` (expects `#4285F4` in the SVG's `toJSON()`, but the rendered tree shows RN SVG's numeric ARGB `payload` encoding instead of a hex string, e.g. `4282549748`). This file and `GoogleMark.tsx` belong to Task 5 (running in parallel per the assignment), not to this task's file list (`Mark.tsx`, `Blobs.tsx`, `Bubble.tsx`, `layers.test.tsx`). Per the brief's rule — "if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it" — it was left untouched. All of this task's own tests pass, and the failure is unrelated to Mark/Blobs/Bubble.

```
npm run typecheck
tsc --noEmit
```
Clean — no errors, no output.

## Deviations from the brief

None. Every file was transcribed exactly as given in the brief and compiled/passed without modification.

## Deferred steps

- Step 7 checkpoint commit ("feat: splash mark, blobs and glass bubble (RN layers)") was **not** made — the rules for this task explicitly forbid git ("Do not run git"). Left for the controller/user to commit.

## Concerns

- The pre-existing `glass.test.tsx` failure (Task 5's file, not mine) will need fixing before the full gate is green; flagging per the brief's instructions but did not touch it.
- No other concerns; blob assets (`blob-1.png`…`blob-4.png`), `DUR`, `ease`, `bez`, `color.markInk`, `COPY.mark`/`COPY.bubble`, `cssAngleToPoints`, `Icon`, and `Mono`/`Sans` from Tasks 1–4/2 were all present exactly as the brief assumed — no missing dependencies.
