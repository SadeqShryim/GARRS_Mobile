# Task 3 Report — Slice 2 (Splash)

**Status: DONE**

## Files Created

- `src/fixtures/splash.ts` — Fixture constants (TILES, HERO, HERO_SIZE, GLYPHS, COPY) verbatim from design/Splash.dc.html
- `src/screens/splash/timeline.ts` — Constants and pure maths functions for the splash marquee kinematics and geometry
- `src/screens/splash/__tests__/timeline.test.ts` — Comprehensive test suite (10 tests covering constants, tile generation, kinematics, geometry, and color matrix)

## Implementation Notes

All code was transcribed exactly as specified in the brief. No deviations from the provided code were required — the implementation compiles and passes without modification.

### Highlights

- **Fixture exports:** Five tile images (required with `require()`), hero image, 12 glyph/tone pairs, and 17 copy strings for splash/auth flows
- **Timeline module:** Exports 22 constants/functions including:
  - Schedule constants (T, ACCEL, RUN_END)
  - Marquee geometry (MQ)
  - Duration map (DUR) with blob drift curve
  - `tile(k)` and `rowTiles(r)` — tile pattern interleaving
  - Kinematics: `speedAt`, `advance`, `blurAt`, `scaleAt`, `rowOffset` (all marked `'worklet'`)
  - Geometry: `coverRect`, `colorMatrix` (the latter also marked `'worklet'`)

All worklet functions are properly marked for Reanimated thread execution.

## Test Results

- **Timeline suite:** 10 tests PASSED (0 failed)
- **Full test gate:** 145 tests PASSED (28 suites; existing suites unaffected)
- **Typecheck:** Clean (0 errors)

### Test Coverage

The timeline test suite validates:
- Schedule and geometry constants matching design source
- Tile interleaving pattern (photo/glyph at k%3, base color alternation, glyph cycling)
- Row construction (7-tile base duplicated)
- Speed acceleration curve (55 → 3255 px/s over 3 s, power-law 2.8)
- Blur ramp (0 at t<1.5s, cubic ramp to 16px at t=3s, zero below 0.25px)
- Scale zoom (1 → 1.16 with p²)
- Row offset modulo wrapping with speed factor and alternating direction
- Cover rect framing (50% 40% position, maintain aspect)
- Color matrix brightness and saturation composition

## Deviations

None. All code compiled and passed on first transcription.

## Deferred Steps

None. All work complete per brief.

## Concerns

None. The implementation is straightforward maths with no platform-specific or environmental risks.
