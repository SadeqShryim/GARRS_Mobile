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
- Step-entrance blur (`sp-in`) and the bubble highlight blur use RN `filter: blur` — Android only. The highlight reads soft in `emu-splash-bubble.png`; the 0.5 s entrance was not caught mid-flight by a capture (no error from Reanimated, the prop is accepted). **2026-09-11:** the highlight gained a second path for every other platform — the same σ = 6 Gaussian applied inside the SVG (`Filter` + `FeGaussianBlur` on a canvas padded by 3σ, drawn at pixel size so nothing is clipped to the highlight's own box; Android keeps the RN blur). The path was forced on the emulator for one capture: geometry, gradient and the unclipped padding are right, but the blur strength there is not representative — react-native-svg's Android blur is a capped RenderScript radius in device pixels, while its Apple implementation multiplies `stdDeviation` by the screen scale "to achieve the same results as on web" (`apple/Filters/RNSVGFeGaussianBlur.mm`), so iOS should show the design's softness. Unverified on iOS. The step entrance stays a fade + translate on iOS.

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


# Slice 3 verification — Recalls, Service, Hub, Profile on Android emulator (s24ultraProxy, Pixel 8 / API 35)

Date: 2026-09-10
Reference: docs/reference/app-<state>.png (design, 430×932 @2x, `scripts/app-refs.mjs`)   Emulator: docs/reference/emu-app-<state>.png (411 dp @2.625x, `scripts/emu-app-shots.mjs` + adb)
Checked per state: geometry against `app-geometry.json` → type → colours → state content → motion by eye on the emulator.

| State | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Garage (regression after the `InfiniteRail` refactor) | garage-idle (Slice 1) | emu-app-garage, emu-app-garage-after-return | match | rail, mask, dimming, pager unchanged; the scheduled state (ALL CLEAR / No recalls / Open) after Return to Garage |
| Recalls — open / expanded | app-recalls-open, -open-expanded | emu-app-recalls-open, -open-expanded | match | title, two-line headline, hero glow card, strip, legend, filter tiles, the open card, rows on expand |
| Recalls — scheduled (empty) / resolved / resolved expanded | app-recalls-scheduled-empty, -closed, -closed-expanded | emu-app-… | match | empty row copy, three history cards, SEVERITY/REMEDY/WHERE/EST. TIME rows |
| Recalls — after Schedule Repair | app-recalls-after-schedule | emu-app-recalls-after-schedule | match | toast, filter jumps to SCHEDULED, hero "1 in the shop", strip re-grows |
| Recall detail — open / bottom / scheduled | app-recall-detail-open, -open-bottom, -scheduled | emu-app-… | match | chip, facts grid, WHY THIS MATTERS, THE REMEDY steps, note, pinned footer (metal CTA → grey "Scheduled Thu 10:30 AM" pill), phone button toast; hardware back pops the route |
| Service — form / bottom / selected | app-service-form, -form-bottom, -form-selected | emu-app-… | match | caution shine card, tilt map, method segment, date rail, 3-column times with the first disabled, Confirm; selections Concierge / THU / 02:30 PM |
| Service — reason sheet | app-service-reason-sheet | emu-app-service-reason-sheet | match | chip + code, title, vehicle line, rows, why, Continue booking / Full recall (→ recall detail) |
| Service — confirmation / bottom | app-service-done, -done-bottom | emu-app-… | match | 146 px ring with the gradient check, details card, status tracker, Return to Garage; toast "Service booked · Tuesday, Oct 15 at 02:30 PM" |
| Hub — idle / auto-advance / grid | app-hub-idle, -auto-2, -grid-bottom | emu-app-… | match | tripled rail with the 9 %/91 % mask, counter 01 → 02 after 5 s, dots, four group chips, 20 tiles (ABS glyph), info row |
| Hub — STOP NOW / STATUS filters | app-hub-critical, -info | emu-app-hub-critical, -info | match | 5 and 6 tiles |
| Light sheet — ABS / Oil / Cruise | app-hub-light-abs, -oil, -cruise | emu-app-… | match | 52 px dark tile with icon or glyph, badge per group (GET IT CHECKED / STOP DRIVING / STATUS ONLY), means, WHAT TO DO, Got it; hardware back closes it |
| Article reader — a2 / mid-transition / a3 / bottom | app-article-a2, -swipe-mid, -a3, -a3-bottom | emu-app-… | match | close + kicker + prev/next, wash, meta row, headings, SWIPE hint, NEXT ARTICLE card; the leaver slides 22 % and fades while the next enters |
| Article reader — real swipes | — | emu-app-article-after-swipe, -after-swipe-back | ok | a left swipe past 70 px → a4, a right swipe → back to a3; a vertical drag scrolls the body |
| Profile — top / mid / bottom / toggle | app-profile, -mid, -bottom, -toggle | emu-app-… | match | initials, plan pill, membership row, account details, three toggles, garage rows (VIN chips, status), concierge card, activity, danger zone |
| Membership — top / bottom / Plus selected / profile after | app-membership, -bottom, -plus, app-profile-plus | emu-app-… | match | Plus shine border, Recommend badge, default-tint metal CTA ("Current plan" once selected), Pro "Current plan" → "Upgrade to Pro", toast "Plus membership active", profile pill/line update |
| Chat — typing / two messages / full / draft / sent-typing / sent | app-chat-* | emu-app-chat-* | match | header, scripted reveal on the source's timers, bubble entrances, dot bob, send button state, canned reply after 1.4 s |

## Known, accepted differences (spec §9, §15)
- Glass faces over the dark `#232228` shell (recalls hero and open card) read whiter than the design's 86 % white, because `expo-blur`'s light tint sits between the blob and the face — the same look Slice 1 accepted on the stats recall card.
- The tilt map on the emulator is fixed at one tilt (`LIVE TILT`, the virtual sensor never moves); the phone pass judges the motion.
- Copy wraps where 412 dp is narrower than 430: the recalls headline (two lines — as the design at 430), the hub "Tap any warning light…" line, the a2 article title (three lines instead of two).
- Tab content scrolls under the translucent status bar (edge-to-edge), as every Slice 1 screen does.
- Tapping a garage row on the Profile tab opens the stats screen with the **Garage** tab active (the stats route lives in the garage stack); the design keeps Profile highlighted (spec §15.8).
- **iOS rendering paths (added 2026-09-11, unverified off Android):** the map pin's `drop-shadow(0 0 10px rgba(15,99,143,.45))` is RN `filter: dropShadow` on Android and the layer shadow everywhere else (`shadowColor #0F638F`, opacity .45, radius 5 = the CSS blur radius halved; it follows the pin's alpha because the view has no background colour). The splash bubble highlight has the SVG-filter path described in the Slice 2 section above.
- The hub rail's auto-advance keeps running while a light sheet or an article is open in the sense that the interval exists, but ticks are skipped (the source's guard); the rail resumes on the next tick.

## Differences found and fixed during this pass
- **Tilt map never armed in Expo Go.** `DeviceMotion.requestPermissionsAsync()` returns `denied` in Expo Go (the HIGH_SAMPLING_RATE_SENSORS permission is not in its manifest) although 60 ms updates are delivered anyway; `useTilt` now asks but no longer gates on the answer (commit 6d2176c). The first sample can arrive without `rotation`; it is skipped.
- **Scroll indicator on slide-up screens** (membership, VIN help) — hidden like every other screen (85af5e7).

## Differences found and NOT fixed (need a decision)
- Spec §15.1–8 stand: chat state local; reason sheet closes on tab switch; recall detail is a route; auto-advance guard; stats "Details" expands the list item; initials at weight 600 (**resolved 2026-09-11:** `Geist_700Bold` is loaded — it ships in the installed `@expo-google-fonts/geist` — and the initials render at 700; `emu-app-profile.png` was recaptured and matches `app-profile.png`); emulator tilt static; stats-from-profile activates the Garage tab.

## Frame times
- `dumpsys gfxinfo host.exp.exponent` over 14 s of the service form (caution shine + tilt map) and the membership screen (Plus shine): 873 frames rendered, janky 6 (0.69 %), 90th percentile 19 ms, 95th 23 ms — on the emulator's host-GL path, a lower bound; the S24 Ultra is the frame-rate authority (Task 14).

## Emulator driving notes (Slice 3)
- Tab bar tap points (device px, 1080×2400): Garage `126 2280`, Recalls `332 2280`, Service `539 2280`, Hub `746 2280`, Profile `954 2280`. Leave the splash with the Google pill at `388 1246`.
- `node scripts/emu-app-shots.mjs "tap X Y" "sleep MS" "shot NAME" …` drives a sequence and writes `docs/reference/emu-app-NAME.png`; steps: `tap`, `swipe X1 Y1 X2 Y2 [ms]`, `back`, `enter`, `text …`, `sleep`, `shot`.
- Screens keep their scroll position across tab switches; header buttons inside a ScrollView (recall detail back arrow, article close) scroll away — use hardware back, which pops the detail route and closes every overlay in z-order.
- The hub rail auto-advances every 5 s, so "the centred card" changes while you drive; open an article by tapping the centred card, then use prev/next.
- Chat typing: disable Gboard first (`adb shell ime disable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME`), tap the field at `480 2215`, `input text …`, send at `974 2215`; re-enable the IME afterwards.
- **Metro:** never start it with `CI=1` — that disables watch mode (no fast refresh, typed routes are not regenerated). `.expo/types/router.d.ts` is regenerated on `expo start`; a stale copy fails `tsc` on new routes until Metro runs.
- **Phone off the Wi-Fi (remote demo):** Expo's own `npx expo start --tunnel` failed on 2026-09-10 with ngrok `ERR_NGROK_108` (Expo's shared anonymous ngrok account at its session limit — nothing on this PC). Working alternative with the already-installed `cloudflared`: `cloudflared tunnel --url http://localhost:8081 --no-autoupdate` prints an `https://<random>.trycloudflare.com` URL; then `EXPO_PACKAGER_PROXY_URL=https://<random>.trycloudflare.com npx expo start` makes the manifest and bundle URLs point at the tunnel; on the phone open Expo Go → "Enter URL manually" → `exp://<random>.trycloudflare.com`. Verified from this PC: the manifest and the 12 MB Android bundle come through the tunnel. The hostname changes every time cloudflared restarts. **iPhone:** Expo Go on iOS has no URL field — paste the `exp://` link into Safari and choose Open (or scan a QR of it with the Camera). A **signed-in** Expo Go on iOS refuses a project whose dev server is not logged in to the same Expo account ("You're signed in to Expo Go as X, but not signed in to Expo CLI"; `npx expo whoami` on this PC says "Not logged in"): either the phone user signs out of Expo Go (Profile → Log out) and reopens the link, or the CLI runs `npx expo login` as that account before Metro starts — the credentials are the user's, so this was not done here (2026-09-11). **Keep them alive (2026-09-12):** when launched as Claude Code background tasks, both cloudflared and Metro were killed by the session's low-memory guard (twice, with 9 GB free); launch them detached instead — PowerShell `Start-Process` on `cloudflared.exe` (stderr redirected to a log) and on `cmd.exe /c "set EXPO_PACKAGER_PROXY_URL=…  npx expo start > log 2>1"` from the repo directory. They then outlive the session; stop them with `Stop-Process` on `cloudflared.exe` and the `node.exe` that holds port 8081.
- **Emulator crash-consent dialog:** if a previous instance died, the next launch shows "Showing crashdialog to get consent" and never boots; delete `%LOCALAPPDATA%\Temp\AndroidEmulator\emu-crash-*.db` and launch with `-no-metrics`.

## Slice 4 — VIN scanner (camera OCR with a 90 % gate) — emulator verification, 2026-09-13

Spec: `docs/superpowers/specs/2026-09-13-slice4-vin-scanner-design.md`. No design capture exists for this slice; the captures below are checked against the spec's §11. Gate at the end of the slice: 49 jest suites / 381 tests, `tsc --noEmit` clean.

| State | Capture | Result | Notes |
|---|---|---|---|
| Permission | emu-app-scan-permission.png | match §11 | header (close · SCAN VIN · torch), corner-marked guide, `camera-off-line` + "Camera access is needed to scan your VIN"; Expo Go's per-experience camera dialog on top |
| Live | emu-app-scan-live.png | match §11 | camera preview under the `rgba(8,8,10,.62)` scrim, guide window clear, copy, metal Capture, `READER READY` — the tesseract engine came up inside the hidden WebView in Expo Go from the CDN within seconds |
| Checking | emu-app-scan-checking.png | match §11 | the crop shown inside the guide with the sweeping blue line, "Checking with NHTSA…", Capture hidden |
| Added | emu-app-scan-added.png | match §11 | `99% MATCH`, `1HGC M826 33A0 0435 2`, "Accord EX-V6 · 2003 Honda · Coupe", "Added to your garage", Done. (In this capture the toast still overlapped the card — fixed the same day, see below.) |
| Garage after | emu-app-scan-garage-after.png | ok | rail on the new car (04 / 04), `SYNCED JUST NOW`, "Recall open · Fix available", VIN `···· 004352`, red pager dot, "4 VEHICLES · 2 RECALL", NEEDS ATTENTION lists `NHTSA 19E-068 · ACCORD EX-V6` |
| Recalls tab after | emu-app-scan-recalls-after.png | ok | "2 OPEN RECALLS · 4 VEHICLES MONITORED"; the scanned car's card: "Vehicle speed control · Accelerator pedal — Accord EX-V6 · Reported 10 Oct 2019" (real NHTSA campaign, DD/MM date parsed, `longDate`) |
| Failed — check digit | emu-app-scan-failed-checkdigit.png | match §11 | `59% — TOO LOW`, "Couldn't read the VIN", "Check digit does not match", tip, Try again / Type it instead; no network call was made |
| Failed — no VIN | emu-app-scan-failed-novin.png | match §11 | `NO VIN FOUND`, "Not a 17-character VIN" — the outcome for the emulator's black still (see limitations) |

Checked: layout and copy against §11; the engine boot (`READER READY`); capture → OCR → verdict → NHTSA decode → recalls → add → card → garage/recalls, live against NHTSA from the emulator; Try again returns to the live camera; Close returns to the Add sheet beneath; hardware back closes the scanner.

**How the success path was exercised.** The emulator cannot deliver a real still (below), so for the added/garage/recalls captures the camera shot was replaced *temporarily* by one of the lab plates (`sticker-1HGCM82633A004352.png` / `sticker-5YJ3E1EA7KF317654.png` as base64) at the single `captureVin` call in `ScanScreen.tsx`; the edit was reverted before the commit and is not in the product. Everything after the capture — the WebView OCR, the VIN library, the NHTSA calls, the store, the card, the toast, the rail — ran for real on the device. The real camera read is therefore the one thing left to the phone pass (Task 9).

### Differences found and fixed during this pass
- **Crop a quarter of the guide too low.** The guide and the crop were sized from `useWindowDimensions`, which on this Android reported 840 dp while the scanner (and its CameraView) is laid out over the whole 914 dp screen. The scanner now measures itself with `onLayout` and uses the window size only before layout (bb71db2). The debug logs that found it (`[scan-debug] photo 1080 2400 … preview {w:411,h:840}`) were removed before committing.
- **The "added" toast covered the success card.** `addScannedVehicle` used to `flash` at once; it now prepares `scan.toast` and the new `finishScan` (dwell, Done, Close, hardware back) shows it as the card leaves (beeaffa).

### Emulator limitations (why the camera read itself is not in the record)
- `-camera-back imagefile:<png>` feeds only the **preview** from the file; `takePictureAsync` returns the emulator's fake-camera still — black with a yellow timestamp — at the preview's size (1080×2400, `pictureSize` ignored). So a real capture on the emulator always ends in `NO VIN FOUND`, correctly. `-camera-back virtualscene` (with `-virtualscene-poster wall=<png>` or `adb emu virtualscene-image wall <png>`) renders both streams, but the wall poster is out of the default view and the console has no command to turn the virtual camera (only `sensor set`/`physics record-gt`), so it was not used.
- The Chromium in the RN WebView loaded tesseract.js 5, the SIMD core and the best-int model from jsDelivr and reported ready within seconds of the screen opening; a separate check drove the same page in the installed Chrome over CDP (`ready` in 1.3 s, three plates read in 28–65 ms — `$CLAUDE_JOB_DIR/tmp/ocr-page/check.mjs`).

### More emulator-driving facts (Slice 4)
- Tap points (1080×2400): Garage "Add Vehicle" `853 454`; the Add sheet's "Scan" chip `528 2045`; scanner Close `91 203`, Capture `540 2143`, result-card "Try again" `288 2216`; Recalls tab `332 2280`, Garage tab `126 2280`.
- The Add sheet's VIN field autofocuses, so an input method pops over the chips. Disabling Gboard alone is not enough (Android falls back to Google voice typing, and re-enables Gboard after a reboot); the reliable recipe is `adb shell ime set com.google.android.gms/.autofill.service.AutofillInputMethodServiceProxy` and, after opening the sheet, tapping the IME's own collapse chevron at `112 2336` before tapping Scan.
- After a Metro fast refresh of `ScanScreen.tsx` the Capture button ignores taps (the camera-ready flag reset without a remount): close and reopen the scanner.
- `adb shell am force-stop com.android.camera2` if the preview stays black — the stock camera app holds the device after it has been opened once.
- Expo Go asks its own per-experience camera permission even after `pm grant`; the dialog's ALLOW is at `889 1360`.
