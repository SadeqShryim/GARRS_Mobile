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


# Slice 2 verification — Splash on Android emulator (s24ultraProxy, Pixel 8 / API 35)

Date: 2026-09-10
Reference: docs/reference/splash-<state>.png (design, 430×932 @2x, `scripts/splash-refs.mjs`)   Emulator: docs/reference/emu-splash-<state>.png (411 dp @2.625x, `scripts/emu-splash-shots.mjs` + adb)
Skia 2.6.2 inside Expo Go 57 — confirmed working before the slice was planned (probe) and again on the finished screen.

| State | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Marquee 0 s / 1 s / 2 s / 2.6 s | splash-marquee-*.png | emu-splash-marquee-*.png | match | tile size, −25° rotation, gaps, shadows, glyph tiles, vignette, zoom and the blur ramp all match; tile positions are time-dependent so compare look, not placement. 0 s is a REPLAY capture, so the auth layer is mid cross-fade in both. |
| Photo cut | splash-photo.png | emu-splash-photo.png | match | sharp photo at 3.2 s with the top/bottom veil; the mark is still ~20 % visible in ours (stacked above the photo — spec §9 flag) |
| Bubble | splash-bubble.png | emu-splash-bubble.png | diff (width) | blurred/darkened photo, glass gradient, inset borders, highlight and backdrop blur+saturate match; **two lines at 411 dp** — see "fixed" below |
| Fade | splash-fade.png | emu-splash-fade.png | match | bubble fading while the four blobs rise; backdrop strength fades with it |
| Auth — email | splash-auth-email.png | emu-splash-auth-email.png | match | header, serif break "Get started / with Recall Hub", Continue with, Google/Apple pills, OR, Email field, footer, blobs |
| Auth — email filled | splash-auth-email-filled.png | emu-splash-auth-email-filled.png | match | arrow appears on a valid address |
| Auth — password | splash-auth-password.png | emu-splash-auth-password.png | match | email carried into the sub-line; email field stays; eye-line; Go back |
| Auth — password filled / eye | splash-auth-password-*.png | emu-splash-auth-password-*.png | match | dots → plain text, eye-off-line, arrow at 6+ characters |
| Auth — confirm / error | splash-auth-confirm*.png | emu-splash-auth-confirm*.png | match | "Passwords do not match." in #FF8A94, Go back |
| REPLAY cross-fade | splash-replay-0.3s.png | emu-splash-replay-0.3s.png | match | auth fades out over the restarting marquee |
| Finish | — | (Garage) | ok | Google pill → `dismissSplash()` → Garage; status bar returns to dark |

Checked per state: geometry against `splash-geometry.json` (header 22 + inset, REPLAY 14/14, pills 42 tall, field 52 tall / 320 wide, OR row, footer 30 + inset) → type → colours → state content → motion by eye on the emulator (acceleration and blur ramp, cut, bubble pop, blob drift, step entrance, cross-fade).

## Known, accepted differences (spec §9)
- Auth pills, fields and the REPLAY pill have no backdrop blur (invisible over an already-blurred backdrop; `expo-blur` cannot sample the Skia canvas).
- The bubble's backdrop filter fades by strength (σ and saturation) instead of alpha — indistinguishable in the captures.
- The mark sits above the photo during the 0.3 s cut instead of beneath it.
- Pill hover `scale(.98)` is the pressed state.
- The source's first run never scrolls the marquee (runtime quirk); the port scrolls on every run (spec §15.1).
- Step-entrance blur (`sp-in`) and the bubble highlight blur use RN `filter: blur` — Android only. The highlight reads soft in `emu-splash-bubble.png`; the 0.5 s entrance was not caught mid-flight by a capture (no error from Reanimated, the prop is accepted).

## Differences found and fixed during this pass
- **`SkPath.close()` deprecation banner.** Skia 2.6 logs a LogBox warning for the mutable path API, which covered the footer in dev. `bubblePath` now uses `Skia.PathBuilder.Make()…build()` (`src/screens/splash/Stage.tsx`; jest mock updated).
- **Bubble copy at 411 dp.** The face has exactly 304 dp of content width here (430 − 26·2 − 28·2 = 304 at the design size too), and the copy measures just over it, so it wraps. The source's CSS would wrap the same way, left-aligned, with `text-wrap: pretty` → "Did you / f*cking check?". The port had `textAlign: center` (not in the source — removed) and wrapped greedily as "Did you f*cking / check?". Fixed with a no-break space before "check?" (`PRETTY_COPY` in `Bubble.tsx`): one line when it fits (≥ 430 dp), the pretty break when it does not. Spec §15.2 resolved this way.

## Differences found and NOT fixed (need a decision)
- **First-run marquee** (spec §15.1): the port scrolls on the first run; the source's first run only zooms and blurs. One constant flips it if the static look is preferred.
- **Auth glass backdrop blur** (spec §15.3): omitted for frame rate; four `BlurView`s over a native copy of the blobs would restore it.
- **Hardware back on the email step exits the app** (the design has no back affordance there); on the password/confirm steps it goes back a step (added in this slice). With a real keyboard open, back closes the keyboard first.

## Frame times
- `dumpsys gfxinfo host.exp.exponent` over REPLAY + 4.2 s (marquee + cut): 216 frames rendered, janky 36 (16.7 %), 90th percentile 65 ms, 95th 73 ms, 99th 85 ms. The emulator renders through software/host GL on this PC (the whole app runs at ~50 fps here); this is a lower bound only — the S24 Ultra (Task 12) is the frame-rate authority.

## Emulator driving notes (Slice 2)
- REPLAY pill tap point on the 1080×2400 AVD: `934 208` (device px). `node scripts/emu-splash-shots.mjs 934 208 [state …]` captures the timed states with the sleep on the device.
- **Disable the soft keyboard before typing into the auth fields**: `adb shell ime disable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME` (re-enable with `ime enable`). With Gboard's floating IME, `adb shell input text` leaves the last word as composing text and the field loses ".app" when focus moves — an injection artefact, not an app defect (verified: raw key events keep the full address). Submit with `input keyevent 66` (Enter) rather than tapping the arrow.
- Auth tap points (px): email field `540 1512`; password field `540 1352`; eye `196 1352`; confirm field `540 1265`; Google pill `388 1246`.
- `am start … exp://127.0.0.1:8081` while the app is already open triggers a full reload (~60 s on this PC); use REPLAY to restart the timeline instead.
- Skia logs `RNSkia: updateAndRelease() failed. The exception above can safely be ignored` on Android — harmless, per its own message.
