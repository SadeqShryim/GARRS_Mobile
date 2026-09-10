# Task 4 report — Slice 3 (app tabs)

## Status

DONE

## Files created/modified

Created:
- `src/ui/StatusChip.tsx`
- `src/ui/Toggle.tsx`
- `src/ui/ShineBorder.tsx`
- `src/ui/InfiniteRail.tsx`
- `src/ui/__tests__/slice3-primitives.test.tsx`

Modified:
- `src/ui/Sheet.tsx` — added `SheetShell`; `Sheet` now composes it. Output tree for `Sheet` is unchanged (same scrim/panel/handle/title/sub/action/children structure).
- `src/screens/garage/Rail.tsx` — replaced with the `InfiniteRail`-delegating version; same props (`onOpenStats`), same `testID="rail"`, same behaviour.
- `src/ui/__tests__/slice3-primitives.test.tsx` — one line adjusted (see Deviations).

All code was transcribed verbatim from `task-4-brief.md` except for the two minimal deviations below. `src/lib/rail.ts` already existed (created by the Task 2 implementer, per the concurrent-work note) with exactly the exports `InfiniteRail.tsx` needs (`GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP`) — it was not touched.

## Test and typecheck summary

- `npm test -- ui`: **10 suites passed, 24 tests passed** (0 failed)
- `npm test -- Garage`: **1 suite passed, 5 tests passed** (0 failed) — Slice 1 garage tests pass unchanged
- `npm test` (full): **36 suites passed, 196 tests passed** (0 failed)
- `npm run typecheck`: **clean, 0 errors**

## Deviations

1. **`src/ui/ShineBorder.tsx` — dropped `pointerEvents="none"` on `Animated.Image`.** The brief's code passes `pointerEvents="none"` as a prop on `Animated.Image`. In this repo's installed versions (RN 0.86 / Reanimated 4.5), `Animated.Image`'s prop type (`Omit<AnimatedProps<Readonly<ImageProps>>, 'ref'>`) does not include `pointerEvents` — it produced `TS2322`. I tried moving it into the `style` object instead (RN's `ViewStyle.pointerEvents` exists), but `ImageStyle` (which `Animated.Image`'s style type derives from) excludes `pointerEvents` too, producing `TS2353`. Since neither placement type-checks, and the sibling primitive `src/ui/MetalButton.tsx:63` (already in the codebase, same rotating-image pattern) also renders its `Animated.Image` with no `pointerEvents` prop at all, I matched that existing precedent and removed the prop entirely. Functionally this has no visible effect: the image is a non-interactive decorative layer with no press handlers, sits under `{children}` in paint order, and is clipped to the card by the parent's `overflow: 'hidden'`.

   This was also the exact typecheck failure the Task 2 implementer flagged as a pre-existing full-tree concern in `task-2-report.md` ("1 pre-existing error in `src/ui/ShineBorder.tsx:24`") before `ShineBorder.tsx` existed as a real file — this fix resolves it.

2. **`src/ui/__tests__/slice3-primitives.test.tsx` — added `layoutMeasurement`/`contentSize` to one `fireEvent.scroll` call.** The brief's test fires `fireEvent.scroll(getByTestId('r'), { nativeEvent: { contentOffset: { x: 4 * 332 } } })`. In the installed `@react-native/virtualized-lists`, `VirtualizedList._onScroll` unconditionally reads `e.nativeEvent.layoutMeasurement` and `e.nativeEvent.contentSize` to update its own scroll metrics, and throws `TypeError: Cannot read properties of undefined (reading 'width')` when those are absent (this runs after `this.props.onScroll(e)` is invoked, but the throw still aborts the `fireEvent.scroll` call before any assertions run). Fixed by adding plausible `layoutMeasurement: { width: 390, height: 700 }` and `contentSize: { width: 3000, height: 700 }` to that one event's `nativeEvent`. This doesn't touch what the test is actually verifying — the `InfiniteRail` `onScroll` handler only reads `contentOffset.x` — and the assertions (`onIndexChange` called with `1`, then `recenterSlot` behaviour on `momentumScrollEnd`) are unchanged and pass.

## Deferred steps

None.

## Concerns

None. The full-tree gate (`npm test && npm run typecheck`) is clean, including files outside this task's scope (`src/lib/*.ts` from the concurrent implementer), so there is nothing to flag there.
