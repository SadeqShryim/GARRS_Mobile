# Task 16 Report — Garage screen: VehicleCard, Rail, Pager, GarageScreen

## Status: DONE

## What was implemented

Created the first real tab content for the app, composing existing primitives:

- `src/screens/garage/VehicleCard.tsx` — single vehicle card: sync/menu header row, name/meta, health bar (amber→red gradient when an open recall exists, teal otherwise), status pill (Recall open/Fix available vs No recalls/Monitored), and the range/VIN footer with the red "Review recall" pill or neutral "Open" pill. Wrapped in an `Animated.View` that dims to 0.55 opacity when not the active card (`dur.dim` timing).
- `src/screens/garage/Rail.tsx` — infinite horizontal `FlatList` over `[vehicles, vehicles, vehicles]` (3x tripled data) with `MaskedView` edge fade, snap-to-card scrolling, live index tracking via `onScroll`, and silent recentering via `onMomentumScrollEnd` so the rail never runs out of slots in either scroll direction.
- `src/screens/garage/Pager.tsx` — row of animated dots per vehicle; active dot widens to 22px and turns red if that vehicle has an open recall, otherwise ink-colored; inactive dots are 6px `color.handle`.
- `src/screens/GarageScreen.tsx` — full screen: header row (menu icon, "RECALL HUB" mono title, notification bell with red dot), "Garage" title + fleet line (`fleetLine()`), "Add Vehicle" `MetalButton`, "YOUR VEHICLES" section with counter + `Rail` + `Pager`, and "NEEDS ATTENTION" section listing open-recall vehicles (or an all-clear row when `recallCount === 0`).
- `app/(tabs)/garage/index.tsx` — replaced Task 13's placeholder body; now renders `<GarageScreen onOpenStats={...} />`, pushing to `/(tabs)/garage/[id]` (that route doesn't exist yet — created in Task 17).

All code was taken verbatim from the brief (Steps 3–7); no logic deviations.

## TDD evidence

**RED** — `npm test -- GarageScreen` before any implementation files existed:

```
FAIL src/screens/__tests__/GarageScreen.test.tsx
  ● Test suite failed to run
    Cannot find module '../GarageScreen' from 'src/screens/__tests__/GarageScreen.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

**GREEN** — `npm test -- GarageScreen` after writing `VehicleCard.tsx`, `Rail.tsx`, `Pager.tsx`, `GarageScreen.tsx`:

```
PASS src/screens/__tests__/GarageScreen.test.tsx (15.055 s)
  GarageScreen
    √ renders header, fleet line, counter and all three vehicles (1973 ms)
    √ lists the open recall under NEEDS ATTENTION and opens the recall sheet (968 ms)
    √ shows all clear once scheduled (951 ms)
    √ Add Vehicle opens the add sheet (1358 ms)
    √ the active card shows recall badge copy and a red action pill (1536 ms)
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## Full-suite and typecheck (run once before reporting)

`npm test` (full repo):

```
Test Suites: 21 passed, 21 total
Tests:       109 passed, 109 total
```

All 21 suites green, including the 5 GarageScreen tests. One pre-existing, unrelated `console.error` ("An update to Toast inside a test was not wrapped in act(...)") appears in `src/ui/__tests__/Toast.test.tsx` — not a file this task touches, not a failure (test still passes), not investigated further per instructions to leave other files' issues alone.

`npm run typecheck` (`tsc --noEmit`):

```
(no output — clean, exit 0)
```

Typed routes are enabled in `app.json` (`experiments.typedRoutes: true`), but `.expo/types` has never been generated in this session (no `expo start`/emulator run), so the router's typed-`Href` augmentation isn't present yet and the `/(tabs)/garage/[id]` pathname type-checks as a plain string — no `as never` cast was needed. This matches the brief's own expectation ("until then typed routes may flag the pathname — that is expected and resolves in the next task"); it simply resolved in the "doesn't flag anything yet" direction because route types haven't been generated at all. Flagging so the controller/Task 17 implementer is aware this could still surface once `.expo/types` exists.

## Files changed

- Created: `src/screens/garage/VehicleCard.tsx`
- Created: `src/screens/garage/Rail.tsx`
- Created: `src/screens/garage/Pager.tsx`
- Created: `src/screens/GarageScreen.tsx`
- Created: `src/screens/__tests__/GarageScreen.test.tsx`
- Modified: `app/(tabs)/garage/index.tsx` (placeholder body replaced with `GarageScreen` wiring)

No other files were touched. No commits (git hold — no `.git` directory exists in the repo; confirmed before finishing).

## Deviations from the brief

None. All four component files, the test file, and the route wiring were written exactly as given in Steps 1, 3, 4, 5, 6, and 7 of the brief.

## Deferred steps

- **Step 9 (emulator verification)** — no emulator is available this session. Skipped per instructions: screenshots `t16-garage.png` / `t16-garage-card2.png` and the visual comparisons against `garage-idle.png` / `garage-card2.png`, the infinite-wrap swipe check, and the `verification.md` note about native flick deceleration are all deferred to whenever an emulator/device is available.
- **Step 10 (checkpoint commit)** — no commits (git hold).

## Self-review findings

- Compared every line of the four new component files and the test file against the brief's code blocks — byte-for-byte identical (copy-pasted, not retyped, to avoid transcription drift).
- Confirmed the `·` (middle dot, U+00B7) characters in `GarageScreen.tsx` and the test file are the correct Unicode codepoint (checked programmatically via `codePointAt`), not a fallback ASCII `.` or a mis-encoded character. No apostrophes appear in this task's copy strings, so the earlier straight-apostrophe regression class doesn't apply here.
- Verified all consumed interfaces (`GlowCard`, `MetalButton`, `Icon`, `Sans`/`Mono`, `useAppStore`, `resetAppStore`, `isOpenRecall`, `fleetLine`, `counter`, `recallCount`, `CARD_W`/`GAP`/`STEP`/`railPadding`/`slotForOffset`/`liveIndex`/`middleSlot`/`recenterSlot`, `color`/`dur` tokens, `SEED_VEHICLES`) by reading their source files first; every prop name and export the brief's code references exists exactly as named — no adaptation was required.
- Confirmed `StyleSheet.absoluteFill` (not `absoluteFillObject`) is used in `Rail.tsx`, matching both the brief's own code and the environment note.
- Confirmed no files outside the brief's list were created or modified.
- Confirmed no `.git` directory exists (git hold intact) and no `git` commands were run.

## Concerns

- None blocking. The only watch-item is the typed-routes situation noted above under Typecheck — purely informational for whoever runs `expo start` next (likely around Task 17), since that's when `.expo/types` will be generated and the `/(tabs)/garage/[id]` href type could start being checked against the not-yet-existing route until Task 17 lands it.
