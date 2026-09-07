# Slice 1 verification — Garage tab on Android emulator (s24ultraProxy, Pixel 8 / API 35)

Date: 2026-09-07
Reference: `docs/reference/<name>.png` (design, 430×932 @1x, headless Chromium)   Emulator: `docs/reference/emu-<name>.png` (1080×2400 px, 411 dp @2.625x — Expo Go 57.0.9 on the Google Play x86_64 API 35 image, WHPX-accelerated, host x64 Windows 11)

| Screen | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Garage idle | garage-idle.png | emu-garage-idle.png | match | 411 dp device vs 430 pt frame: rail padding derives from width (46.5 vs 56 dp); glow blob position differs between captures because it animates in both |
| Garage card 2 | garage-card2.png | emu-garage-card2.png | match | reached via the pager dot |
| Stats — Model S | stats-model-s.png | emu-stats-model-s.png | match | recall hero glow animates; page bottom sits under the tab bar in both |
| Stats — Taycan | stats-taycan.png | emu-stats-taycan.png | match | |
| Add sheet empty | sheet-add-empty.png | emu-sheet-add-empty.png | diff (minor) | placeholder colour — see "NOT fixed"; emulator capture taken after dismissing the soft keyboard (the design has none) |
| Add sheet sample | sheet-add-sample.png | emu-sheet-add-sample.png | match | |
| VIN help | vin-help.png | emu-vin-help.png | match (after fix) | Scan button icon order was wrong — fixed below |
| Recall sheet | sheet-recall.png | emu-sheet-recall.png | match | em dash in "Tesla Service — 6.2 mi" verified |
| Added + toast | garage-added-toast.png | emu-garage-added-toast.png | match | reference is a retake with 6 vehicles (ledger, Task 3); emulator shows 4 — layout identical |
| Tab bar — recalls | tab-recalls.png (bar only) | emu-tab-recalls.png | match | stub body is by design |
| Tab bar — profile | tab-profile.png (bar only) | emu-tab-profile.png | match | stub body is by design |
| Splash stub | — | emu-splash-stub.png | n/a | stub, replaced in slice 6 — the real Splash with the marquee animation is outside Slice 1 by spec ("Out (later slices)") |

Checked per screen in the brief's order: spacing/alignment → type size/weight/tracking → colours → state-dependent content → motion (by eye on the emulator: sheet slide + scrim fade, pager dot widening, toast, rail snap, metal-button idle shimmer, card/hero glow drift).

## Known, accepted differences (from the spec §9)
- Rail flick deceleration is the platform's, not the source's 420 ms ease-out cubic. Centring, neighbour dimming and infinite wrap match (wrap verified: swiping right from card 1 lands on card 3).
- Metal button has no hover speed on touch; idle 7 s and pressed 2.33 s only.
- Glow blob baked once at 210/16 px and scaled to 190 for the vehicle card (source blur 14).
- Blur intensities: **face = 55, scrim = 7** (`src/theme/tokens.ts`). expo-blur has no px→intensity formula; tuned by eye against the references using side-by-side crops at matched physical scale. The design's scrim is `blur(2px)` over `rgba(23,22,26,.28)`: on the emulator 6 was visibly too crisp and 8 visibly too soft. The card face is `blur(24px)` over 82 % white: 55 gave the reference's wider, paler haze better than 40.

## Differences found and fixed during this pass
- VIN help footer **Scan** button rendered its camera icon *after* the label (it reused `OutlinePill`, whose trailing-icon order is right for "Details ↗"). The design (`GaragePrototype.dc.html`, `vh.onScan`) has the icon *before* the label at the "Enter manually" measurements (icon 17, text 15/500, gap 7). Rebuilt as a sibling `Pressable` in `src/screens/VinHelpScreen.tsx`; the existing test still passes.
- Android hardware/gesture **back exited the app** while the add sheet, recall sheet or VIN help was open — overlays are store-driven, not router routes, so nothing handled it. `src/overlays/OverlayHost.tsx` now registers a `BackHandler` that closes the topmost overlay (VIN help → sheet → nothing), covered by `src/overlays/__tests__/OverlayHost.test.tsx`. Verified on the emulator: back closes the recall sheet; back on VIN help reveals the sheet; back again closes it.
- Blur tokens tuned: `face` 40 → 55, `scrim` 8 → 7.

## Differences found and NOT fixed (need a decision)
- **VIN placeholder colour.** The design sets no placeholder colour, so the reference shows Chromium's default placeholder grey — measured **#757575** in `sheet-add-empty.png`. The app uses `color.ink7` (#9A99A2), visibly lighter. Left as `ink7` because it is a palette token and the reference value is a browser default nobody chose; change `placeholderTextColor` in `AddVehicleSheet.tsx` to `'#757575'` if the reference is to be matched literally.
- **Fast rail fling via injected input.** `adb shell input swipe` over 300 ms did not advance the rail (a slower drag and the pager dots do). Almost certainly an artefact of synthetic input — re-check with a finger in Task 23 before treating it as a bug.

## Web pre-pass (same day, Expo web in headless Chrome, 430×932 — informational only)
- All copy verified from the DOM: curly apostrophes (U+2019), em dashes and middle dots intact on every screen.
- Two web-only rendering gaps, both confirmed absent on Android: `@react-native-masked-view/masked-view`'s web shim renders only the mask element and drops children (so the rail and the dot pattern vanish on web), and inactive tab scenes bleed through the transparent `sceneStyle` because bottom-tabs on web only pushes them behind with `zIndex: -1`. Neither is an app defect for the Android/iOS targets.

## Emulator driving notes (for Task 23 and later passes)
- Metro must advertise the reverse-forwarded loopback: run `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` and `adb reverse tcp:8081 tcp:8081`, then open `exp://127.0.0.1:8081`. `expo start --localhost` binds Metro to `[::1]` only, which `adb reverse` (IPv4) cannot reach → Expo Go "Failed to download remote update". If Expo Go shows "Something went wrong" because it opened before Metro was listening, tap its reload.
- Metro started with `CI=1` does not watch files; for Fast Refresh run plain `npx expo start < /dev/null`.
- Expo Go 57's floating **Tools button** is turned off in its dev menu (the toggle persists); the first-launch dev-menu sheet must be closed with its ✕, not "Continue".
- The AVD runs with `hw.keyboard=no`; the soft keyboard opens with the add sheet (autoFocus) and one back press dismisses it without closing the sheet. Android re-enables Gboard after every reboot, so `ime disable` does not stick.
- `uiautomator dump` cannot reach an idle state because of the continuous animations; verify state from screenshots.
