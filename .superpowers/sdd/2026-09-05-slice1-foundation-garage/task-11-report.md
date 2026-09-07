# Task 11: MetalButton — Report

## Status: DONE (Step 5 deferred to controller per instructions)

## Files created
- `C:\GARRS_Mobile\src\ui\MetalButton.tsx`
- `C:\GARRS_Mobile\src\ui\__tests__\MetalButton.test.tsx`

Both transcribed verbatim from the task brief (`task-11-brief.md`, Steps 1 and 3). No other files were touched.

## Step 1/2: RED

Wrote the test file exactly as specified in the brief, then ran:

```
$ npm test -- MetalButton
FAIL src/ui/__tests__/MetalButton.test.tsx
  ● Test suite failed to run
    Cannot find module '../MetalButton' from 'src/ui/__tests__/MetalButton.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

Confirmed RED for the expected reason (module not yet created).

## Step 3: Implementation

Wrote `src/ui/MetalButton.tsx` verbatim from the brief — `MetalButton` component plus the internal `RippleDot` helper, `BEZEL` map (`metal-blue.png` / `metal-mix.png` / `metal-default.png`), `FACE_BLUE`/`FACE_DARK` gradient specs, `SHADOW_IDLE`/`SHADOW_PRESSED` box-shadow strings, and `TEXT_SHADOW`.

## Step 4: GREEN + typecheck

```
$ npm test -- MetalButton
PASS src/ui/__tests__/MetalButton.test.tsx
  MetalButton
    √ renders the label and icon and fires onPress (616 ms)
    √ uses the blue ink on the blue tint and grey ink otherwise (99 ms)
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

```
$ npm run typecheck
> tsc --noEmit
(no output — clean)
```

Full suite (to check for regressions / other agents' in-flight files):

```
$ npm test
PASS src/__tests__/smoke.test.tsx
PASS src/lib/__tests__/gradient.test.ts
PASS src/fixtures/__tests__/fixtures.test.ts
PASS src/assets/__tests__/assets.test.ts
PASS src/ui/__tests__/GlowCard.test.tsx
PASS src/ui/__tests__/Txt.test.tsx
PASS src/lib/__tests__/derive.test.ts
PASS src/ui/__tests__/MetalButton.test.tsx
PASS src/store/__tests__/useAppStore.test.ts
PASS src/lib/__tests__/rail.test.ts
PASS src/ui/__tests__/DotPattern.test.tsx
PASS src/ui/__tests__/HealthGauge.test.tsx
Test Suites: 12 passed, 12 total
Tests:       85 passed, 85 total
```

All 12 suites / 85 tests pass; whole-project `tsc --noEmit` is clean. No failures attributable to other agents' in-flight files at this snapshot.

## Type-level adjustments

None required. Checked in advance:
- `node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:516` already types `ViewStyle.boxShadow?: ReadonlyArray<BoxShadowValue> | string | undefined`, so the `boxShadow` string literals in the two `View` style arrays typecheck without an `as ViewStyle` cast.
- `Animated.Image` (from `react-native-reanimated`'s default export applied to the RN `Image`... actually `Animated.Image` is Reanimated's pre-wrapped animated `Image` component) accepted the `source={BEZEL[tint]}` prop without complaint — no need for the `Animated.createAnimatedComponent(Image)` fallback mentioned in the task context.

So the code is an unmodified, byte-for-byte transcription of the brief's Step 3 block.

## Step 5: deferred

Per instructions, emulator verification (adding a temporary `<MetalButton>` to `app/index.tsx`, running `expo start`, screenshotting to `docs/reference/t11-metal.png`, comparing against `docs/reference/garage-idle.png`) was **not** performed — the emulator is being rebuilt. This step is deferred to the controller.

## Self-review (against the brief's Self-Review checklist)

- **Idle/pressed shadow strings**: transcribed exactly — `SHADOW_IDLE = '0 0 0 1px rgba(0,0,0,0.3), 0 14px 10px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.16)'`, `SHADOW_PRESSED = '0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'`, and the inset press shadow `'inset 0 2px 4px rgba(0,0,0,0.4)'` on the face view. Verified byte-for-byte against the brief.
- **Bezel spin**: `spin = (typeof width === 'number' ? width : 320) * 2.4` (→ 320·2.4 when `width==='auto'`), rotating continuously via `withRepeat(withTiming(from + 360, ...), -1, false)` where `from = rot.value % 360` is captured and reassigned before starting the next lap (the "restart trick" so re-triggering the effect on `pressed` change doesn't snap the rotation back to 0). Duration switches between `dur.metalIdle` (7000) and `dur.metalPressed` (2333) based on `pressed`. Confirmed present, unmodified.
- **Face inset 2 with 160°/180° gradients via `cssAngleToPoints`**: face view is inset by `left/right/top/bottom: 2`; `FACE_BLUE.angle = 160`, `FACE_DARK.angle = 180`; `pts = cssAngleToPoints(face.angle, box.w, box.h)` feeds `start`/`end` into `LinearGradient`. Confirmed.
- **Ripple**: 20×20 `Svg` with a `RadialGradient` (`stopOpacity` 0.45 → 0), `Circle` r=10 (i.e., 20px diameter), animated `scale: 4 * p.value` (0→4) and `opacity: 0.5 * (1 - p.value)` (0.5→0) over `dur.ripple` = 600 ms with `bez(ease.cssEaseOut)`. Confirmed.
- **Press dip**: `wrapStyle` = `translateY: press.value` (0→1) and `scale: 1 - 0.02 * press.value` (1→0.98), driven by `press.value = withTiming(pressed ? 1 : 0, { duration: dur.press, easing: bez(ease.press) })` where `dur.press = 150`. Confirmed = `translateY(1) scale(.98)` at 150 ms.
- **Label/icon text shadow**: both `Icon` and `Sans` receive `style={TEXT_SHADOW}` (`textShadowColor: 'rgba(0,0,0,0.5)'`, offset `{0,1}`, radius 2). Confirmed.
- **Pressable accessibility**: `<Pressable accessibilityRole="button" accessibilityLabel={label} ...>` — confirmed, matches the test's `getByLabelText('Add Vehicle')`.
- **Ink colors**: `ink = tint === 'blue' ? '#EAF7FF' : '#8A8F94'` — matches both test assertions (blue → `#EAF7FF`; `mix` falls into the `else` branch → `#8A8F94`). `Sans` renders `style={[{...color...}, style]}` so `getByText(...).props.style` contains an object with `color: ink` — confirmed this satisfies `expect.arrayContaining([expect.objectContaining({ color: ... })])`.
- **Label weight**: `Sans` is used with no `weight` prop, so it defaults to 400 (regular) per `Txt.tsx`'s `weight = 400` default — matches "the design's metal label is regular weight, keep it."

Both tests pass; full suite (12 suites / 85 tests) and whole-project typecheck are clean.

## Concerns

None. No files outside the two assigned files were created or modified. No competing mocks were added — relied on the existing `jest.setup.ts` mocks for `@expo/vector-icons`, `expo-linear-gradient`, and Reanimated's `setUpTests()`, plus jest-expo's native `react-native-svg` rendering.
