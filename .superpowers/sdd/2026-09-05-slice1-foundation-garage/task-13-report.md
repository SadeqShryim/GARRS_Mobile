# Task 13 Report: `HumpTabBar`, tab layout, `TabStub`, garage route skeleton

## Status: DONE_WITH_CONCERNS

Two small, necessary deviations from the brief's verbatim source (both required by the actual installed toolchain, not by choice — details below). All four `HumpTabBar` tests and the `TabStub` test pass; full suite and typecheck are clean apart from two pre-existing failures in another agent's in-flight files (`Sheet.test.tsx`, `Toast.test.tsx`).

## Step 1/2: RED

Wrote the tests exactly as given in the brief:
- `src/ui/__tests__/HumpTabBar.test.tsx`
- `src/screens/__tests__/TabStub.test.tsx`

Command: `npm test -- HumpTabBar TabStub`

Output (abridged):
```
FAIL src/screens/__tests__/TabStub.test.tsx
  Cannot find module '../TabStub' from 'src/screens/__tests__/TabStub.test.tsx'
FAIL src/ui/__tests__/HumpTabBar.test.tsx
  Cannot find module '../HumpTabBar' from 'src/ui/__tests__/HumpTabBar.test.tsx'

Test Suites: 2 failed, 2 total
Tests:       0 total
```
Confirmed RED.

## Step 3/4/5: Implementation

Files created (all verbatim from the brief, see deviations below):
- `src/ui/HumpTabBar.tsx`
- `src/screens/TabStub.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/garage/_layout.tsx`
- `app/(tabs)/garage/index.tsx`
- `app/(tabs)/recalls.tsx`
- `app/(tabs)/service.tsx`
- `app/(tabs)/hub.tsx`
- `app/(tabs)/profile.tsx`

File deleted:
- `app/index.tsx`

## Step 6: GREEN + typecheck

Command: `npm test -- HumpTabBar TabStub`
```
PASS src/screens/__tests__/TabStub.test.tsx
PASS src/ui/__tests__/HumpTabBar.test.tsx

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

Full suite, command: `npm test`
```
Test Suites: 2 failed, 14 passed, 16 total
Tests:       2 failed, 90 passed, 92 total
```
The 2 failing suites are `src/ui/__tests__/Sheet.test.tsx` and `src/ui/__tests__/Toast.test.tsx` — both `TypeError: useSafeAreaInsets is not a function`. These are owned by the concurrently-working agent building `src/ui/{Sheet,Toast,SlideUpScreen,OutlinePill}.tsx` per the task brief's "Facts the brief cannot know" note; I did not touch those files and left them alone. All my own files pass.

Command: `npm run typecheck`
```
(no output — clean)
```

## Typing adjustments (exactly what and why)

1. **Import source for `BottomTabBarProps` changed from `'@react-navigation/bottom-tabs'` to `'expo-router/build/react-navigation/bottom-tabs'`.**
   Investigated first: `@react-navigation/bottom-tabs` is **not installed** in this project — `npm ls @react-navigation/bottom-tabs` returns empty, there is no `@react-navigation` scope at all under `node_modules`, and it does not appear anywhere in `package-lock.json`. Expo Router 57.0.19 no longer depends on the community `@react-navigation/*` packages; it vendors its own fork internally at `expo-router/build/react-navigation/bottom-tabs` (confirmed by reading `expo-router/build/layouts/TabsClient.js`, which does `const bottom_tabs_1 = require("../react-navigation/bottom-tabs")` and builds the actual `<Tabs>` navigator from it). So the brief's stated context ("`@react-navigation/bottom-tabs` (via expo-router) are installed") does not hold for this expo-router version.
   Rather than adding a new, unpinned `@react-navigation/bottom-tabs` dependency (risking a type/behavior mismatch against the fork that `<Tabs>` actually renders with, plus needing untested peer packages like `@react-navigation/native`/`elements`/`core` that also aren't installed), I imported `BottomTabBarProps` from the exact module expo-router itself uses. This is a type-only import (erased entirely by Babel/Metro at build time and by Jest, which never touch it) and is guaranteed structurally identical to what `<Tabs tabBar={...}>` expects, since it is the same type. `expo-router`'s `package.json` has no `"exports"` field, so this deep path resolves normally under `moduleResolution: "bundler"` for both `tsc` and the bundler — verified directly by a scratch `.ts` file typechecking clean before writing the real component.
   This also let me confirm the brief's `sceneStyle` vs. `sceneContainerStyle` question: `expo-router/build/react-navigation/bottom-tabs/types.d.ts` defines `sceneStyle?: StyleProp<ViewStyle>` on `BottomTabNavigationOptions` (no `sceneContainerStyle` anywhere) — so the brief's `screenOptions={{ ..., sceneStyle: {...} }}` in `app/(tabs)/_layout.tsx` is correct as written, no change needed there.

2. **`StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` in `src/ui/HumpTabBar.tsx`'s `center` style.**
   `tsc` rejected `StyleSheet.absoluteFillObject` (`TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?`). I checked the installed `react-native` (0.86.3) runtime source (`node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js`): `absoluteFillObject` has been removed from this RN version entirely — only `absoluteFill` exists now, and it is defined as the same plain, frozen object `{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }` that `absoluteFillObject` used to be (as opposed to `StyleSheet.create`'s registered-ID style, which was never spreadable). This is not just a typecheck nitpick: at runtime, `StyleSheet.absoluteFillObject` is `undefined`, and `{ ...undefined, ... }` silently drops the absolute-position styles without throwing — so the brief's exact code would have compiled to a real (silent) layout bug in this RN version, not merely a `tsc` complaint. Swapped in `StyleSheet.absoluteFill`, which is a drop-in semantic equivalent.

No other adjustments were needed. `navigation.navigate(t.id, ...)` (Step 6's documented `as never` escape hatch) typechecked fine as written — the vendored `BottomTabBarProps`'s `navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>` types `navigate` loosely enough (`ParamListBase`) that `t.id` (a `TabId`) and the conditional `{ screen: 'index' } | undefined` payload are both accepted without a cast. The `as never` fallback was **not used**.

## Step 7: deferred

Emulator verification (screenshots, visual comparison to `garage-idle.png` / `tab-recalls.png`) is explicitly skipped per instructions — the emulator is being rebuilt. Deferred to the controller to run when the emulator is available.

## Self-review

Checked against the brief line-by-line:
- `HUMP_PATH` string: transcribed verbatim (byte-for-byte from the brief).
- `viewBox="0 0 202.9 45.5"` + `preserveAspectRatio="none"`: present, verbatim.
- Hump `bottom: 27`: present in `styles.hump`.
- `humpXFor(itemLeft, itemWidth) = itemLeft - (layout.humpW - itemWidth) / 2`: verbatim; test `humpXFor(100, 82.8)` → `≈110.9` passes.
- Item lift `-6 * lift.value`, circle `scale: lift.value` pop, icon cross-fade via `tone` (`opacity: tone.value` / `opacity: 0.62 * (1 - tone.value)`), `dur.hump`/`bez(ease.hump)` for lift, `dur.color`/`Easing.inOut(Easing.ease)` for tone: all verbatim.
- Bar radii `11 11 28 28`: `styles.dark` has `borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 28, borderBottomRightRadius: 28`. Verbatim.
- `paddingBottom: 6` on `styles.dark`, `paddingHorizontal: 8` on `styles.menu`: verbatim.
- White wrapper `View` with `backgroundColor: color.surface, paddingBottom: insets.bottom`: verbatim.
- Five `Tabs.Screen`s in `app/(tabs)/_layout.tsx` in order garage, recalls, service, hub, profile: verbatim.
- `app/(tabs)/garage/_layout.tsx`: `Stack` with `animation: 'none'` and `contentStyle: { backgroundColor: 'transparent' }`: verbatim.
- Four stub routes (`recalls.tsx`, `service.tsx`, `hub.tsx`, `profile.tsx`) each rendering `<TabStub tab="...">` with the matching id: verbatim, ids double-checked against `TABS` fixture ids.
- `app/index.tsx` deleted: confirmed (`test -f` returns not-found).
- All four `HumpTabBar` tests + the `TabStub` test pass (5/5). Full suite: 90/92 passing; the 2 failures belong to another agent's not-yet-complete files and are unrelated to this task's changes.
- Typecheck (`tsc --noEmit`) is clean.

## Concerns

1. The task's supplied context ("`@react-navigation/bottom-tabs` ... installed") does not match this repo — the package is genuinely absent and expo-router vendors its own copy instead. I resolved this myself (see "Typing adjustments" above) rather than stopping for `NEEDS_CONTEXT`, since it was a discoverable, unambiguous environment fact with a safe, low-risk fix (a type-only import from the exact module expo-router itself uses, erased at build time either way). Flagging it here in case another task in this slice makes the same assumption — worth checking any other brief that references `@react-navigation/bottom-tabs`, `@react-navigation/native`, or similar directly.
2. `StyleSheet.absoluteFillObject` is gone from RN 0.86; any other brief/source in this port that still writes `StyleSheet.absoluteFillObject` will hit the same silent-bug pattern (compiles at runtime in JS, but drops the absolute positioning) and should be swapped to `StyleSheet.absoluteFill`.
3. The `Sheet.test.tsx` / `Toast.test.tsx` failures are pre-existing/in-flight from another agent's task and not caused by anything in this change — noted per instructions, not fixed.
