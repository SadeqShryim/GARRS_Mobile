# Task 4 Report: Bake effect assets and build the Remixicon glyph map

## Status: DONE_WITH_CONCERNS

(Only concern: an unforeseen tsconfig fix was required — see below. All functional requirements met, all tests and typecheck pass pristinely.)

## What was implemented

1. **`scripts/build-remix-glyphmap.mjs`** — reads `node_modules/remixicon/fonts/remixicon.glyph.json`, extracts each icon's `&#xNNNN;` unicode entity into a `{ name: codePoint }` map keyed without the `ri-` prefix, writes `src/assets/remixicon.glyphmap.json`, and copies `remixicon.ttf` into `src/assets/fonts/`.
2. **`scripts/bake-assets.mjs`** — pure-Node/`pngjs` rasterizer producing:
   - `metal-default.png`, `metal-blue.png`, `metal-mix.png`: 1536×1536 RGBA conic-gradient "chrome" bezels (768 logical px × 2 device scale), 8-stop ramps, clockwise from 12 o'clock, closed back to the first colour, Gaussian-blurred at σ = 1.5 logical px (= 3 device px).
   - `glow-blob.png`: 612×612 RGBA — a 210 logical px (420 device px) circle filled left→right with a pink→red→amber gradient, 48 logical px (96 device px) bleed on all sides, Gaussian-blurred at σ = 16 logical px (= 32 device px).
   - Separable Gaussian blur operates on premultiplied alpha, treating out-of-bounds as transparent.
3. **`src/assets/__tests__/assets.test.ts`** — verifies the glyph map excludes `ri-`-prefixed keys and contains all 38 icon names actually used by the app; verifies all four PNGs' width/height/colour-type by reading raw PNG header bytes (`IHDR` fields at offsets 16, 20, 25).

All three files were transcribed verbatim from the brief — confirmed with an automated diff of the brief's code blocks against the files on disk (all three: identical, zero differences).

## RED run

Command: `npm test -- src/assets`

```
FAIL src/assets/__tests__/assets.test.ts
  ● Test suite failed to run

    Cannot find module '../remixicon.glyphmap.json' from 'src/assets/__tests__/assets.test.ts'

Test Suites: 1 failed, 1 total
Tests:       0 total
```

Matches the brief's expected failure exactly.

## Generation commands

Command: `npm run build-glyphmap`
```
> recall-hub@1.0.0 build-glyphmap
> node scripts/build-remix-glyphmap.mjs

wrote 3020 glyphs
```

Command: `npm run bake-assets` (timed)
```
> recall-hub@1.0.0 bake-assets
> node scripts/bake-assets.mjs

metal-default.png 1536x1536
metal-blue.png 1536x1536
metal-mix.png 1536x1536
glow-blob.png 612x612

real    0m8.907s
```

Both match the brief's expected output exactly. Baking took ~9 seconds, well under the 2-minute concern threshold.

## GREEN run

Command: `npm test -- src/assets`

```
PASS src/assets/__tests__/assets.test.ts
  remixicon glyph map
    √ maps names without the ri- prefix to code points
    √ has menu-2-line
    ... (38 icon checks, all passing)
  baked assets
    √ metal-blue.png is 1536x1536 RGBA
    √ metal-mix.png is 1536x1536 RGBA
    √ metal-default.png is 1536x1536 RGBA
    √ glow-blob.png is 612x612 RGBA

Test Suites: 1 passed, 1 total
Tests:       44 passed, 44 total
```

## Visual inspection of the PNGs (Step 6)

Viewed with the Read tool:

- **`metal-blue.png`**: A brushed-chrome "sunburst" — deep blue spoke pointing straight up (12 o'clock), sweeping clockwise through light blue (toward 1–2 o'clock), near-white (~3 o'clock), light blue again, deep blue (visible as a soft dark seam running straight down from centre — this is the ramp's midpoint at 6 o'clock, i.e. the wrap-around point of the conic gradient, not a defect), white, mid-blue, light blue, and closing back to the starting deep blue at the top. The blur is subtle (σ=3 device px against a 1536px canvas) — spokes are soft-edged with no hard banding or moiré.
- **`metal-default.png`**: Same conic sunburst structure, rendered in the muted blue-grey/slate ramp — an overall cooler, deeper "gunmetal" look with a near-white highlight band and a very dark near-black spoke.
- **`metal-mix.png`**: Same structure, in a mostly grey/near-white ramp with one distinct light-blue accent wedge and a near-black spoke — reads as a grayscale brushed metal with a blue highlight.
- **`glow-blob.png`**: A soft circular disc, pink on the left, blending through red at the centre, to amber/orange on the right (matching the `linear-gradient(90deg,#ec4899,#ef4444,#eab308)` spec), with a wide, smoothly-fading transparent halo (48 logical / 96 device px bleed) well before the canvas edge — no hard circle edge is visible, consistent with σ=16 logical px blur.

All four match the brief's Step 6 description precisely.

## Files created

- `C:\GARRS_Mobile\scripts\bake-assets.mjs`
- `C:\GARRS_Mobile\scripts\build-remix-glyphmap.mjs`
- `C:\GARRS_Mobile\src\assets\__tests__\assets.test.ts`
- `C:\GARRS_Mobile\src\assets\remixicon.glyphmap.json` (generated, 3020 entries, 70310 bytes)
- `C:\GARRS_Mobile\src\assets\fonts\remixicon.ttf` (generated, copied, 563252 bytes)
- `C:\GARRS_Mobile\src\assets\images\metal-default.png` (generated, 1536×1536 RGBA, 1075336 bytes)
- `C:\GARRS_Mobile\src\assets\images\metal-blue.png` (generated, 1536×1536 RGBA, 892227 bytes)
- `C:\GARRS_Mobile\src\assets\images\metal-mix.png` (generated, 1536×1536 RGBA, 1016203 bytes)
- `C:\GARRS_Mobile\src\assets\images\glow-blob.png` (generated, 612×612 RGBA, 147799 bytes)

One file outside the assigned set was modified:
- `C:\GARRS_Mobile\tsconfig.json` — see "Unforeseen fix" below.

## Self-review findings

- Glyph map: 3020 numeric entries, 0 keys with an `ri-` prefix (verified directly with `node -e ...`, not just via the test).
- PNG headers verified directly (independent of the jest test) by reading raw IHDR bytes: all three `metal-*.png` are 1536×1536 colorType 6; `glow-blob.png` is 612×612 colorType 6.
- All three authored files (`build-remix-glyphmap.mjs`, `bake-assets.mjs`, `assets.test.ts`) diffed programmatically against the brief's fenced code blocks — byte-for-byte identical after stripping only leading/trailing blank lines. Ramps, sizes, blur sigmas, and the clockwise-from-top angle math (`atan2(x-c, -(y-c))`, wraparound handling) are exactly as specified.
- `npm test` (full suite): 5 suites, 57 tests, all passing, pristine output (no warnings).
- `npm run typecheck`: clean, no output, exit 0.
- Confirmed `remixicon` and `pngjs` were pre-installed as stated in the task context (`node_modules/remixicon/fonts`, `node_modules/pngjs` both present) — no install needed.
- Did not touch `docs/reference/*`, `scripts/serve-design.mjs`, or any other file belonging to the concurrent emulator/browser tasks.
- Did not run any git command, per the "no git" instruction.

## Unforeseen fix: tsconfig.json `types` array

`npm run typecheck` initially failed (exit code 2) with three errors in the new test file:

```
src/assets/__tests__/assets.test.ts(1,30): error TS2591: Cannot find name 'node:fs'. ...
src/assets/__tests__/assets.test.ts(2,25): error TS2591: Cannot find name 'node:path'. ...
src/assets/__tests__/assets.test.ts(16,34): error TS2304: Cannot find name '__dirname'.
```

Root cause: `tsconfig.json` had `"types": ["jest"]`. When `compilerOptions.types` is explicitly set, TypeScript only auto-includes the ambient `.d.ts` files for the packages listed there — it stops auto-including every `@types/*` package it can find (which is the default behavior when `types` is omitted). `@types/node` (v26.4.1) is present in `node_modules/@types/node` — it's a legitimate, well-established transitive dependency (pulled in by `babel-preset-expo`, jest tooling, and many others — confirmed by grepping `node_modules/*/package.json` for `"@types/node"` dependents), not an accidental artifact — but it was never being loaded because it wasn't named in the `types` array, so none of its ambient globals (`__dirname`, the `node:fs` / `node:path` module augmentations, etc.) were visible.

This is the same class of issue the task context flagged for `resolveJsonModule` (that one turned out to already be satisfied via Expo's base tsconfig, so no change was needed there). Following the same judgment-call/report protocol, I added `"node"` to the array:

```diff
-    "types": ["jest"],
+    "types": ["jest", "node"],
```

After this change, `npm run typecheck` passes cleanly (no output, exit 0), and `npm test` continues to pass all 57 tests across all 5 suites. This is a one-line, additive, low-risk change to a shared config file — it only widens which ambient type packages TS auto-includes and does not affect other agents' files, but flagging it since it touches a file outside my assigned file list.

## Concerns

- The `tsconfig.json` edit (adding `"node"` to `types`) touches a shared config file that other concurrent agents may also be relying on. It is additive and should not break anything (verified full `npm test` + `npm run typecheck` pass afterward), but the other agents (or whoever finishes the branch) should be aware of this change.
- No other concerns. All generated assets exist with exact expected dimensions/colour types, both scripts and the test transcribe the brief verbatim, generation was fast (~9s) and deterministic, and the visual output matches the brief's description precisely.
