# Where we left off

**Last updated: 2026-09-18, session 10** — the first run on a real iPhone: the Expo Go login gate
solved, and a launch-route fix (`app/index.tsx`, `app/+not-found.tsx`). Session 9 designed, built and
emulator-verified **Slice 4, the camera VIN scanner**: point the camera at a VIN, capture, on-device
OCR, a confidence score, and at 90 % or more the vehicle is decoded against NHTSA, its open recalls
are pulled, and it lands in the garage; below 90 % an error asks to try again. Sessions 7–8 built
Slice 3 and the follow-ups (see their sections below).

Read this, then `.superpowers/sdd/2026-09-10-slice3-app-tabs/progress.md` (the Slice 3
execution ledger). If the two disagree, the ledger is newer and wins. The Slice 1 and Slice 2 ledgers
(`.superpowers/sdd/2026-09-05-slice1-foundation-garage/progress.md`,
`.superpowers/sdd/2026-09-09-slice2-splash/progress.md`) are closed except for their phone passes.

---

## One-paragraph summary

**Recall Hub** is a vehicle safety-recall app. It exists as a finished, approved prototype
authored in Claude Design (`design_handoff_recall_hub/`), and is being ported to
**Expo / React Native**. Slice 1 (Foundation + Garage) shipped in sessions 1–5, Slice 2 (the real
Splash/Auth) in session 6. This session planned and executed **Slice 3 — everything else**: the
Recalls tab and recall detail, the Service tab with its tilt map, reason sheet and confirmation, the
Hub tab with the auto-advancing article rail, the 20 dashboard lights, the light sheet and the
swipeable article reader, and the Profile tab with its toggles, the membership screen and the
concierge chat. The design's "NOT IN THIS PROTOTYPE YET" stub is gone: **every tab and every
overlay in the design is ported**, verified on the emulator against 41 reference captures of the
design. Only the on-device pass on the phone remains, for all three slices.

## Status at a glance

| | |
|---|---|
| Slice 1 (Garage) | ✅ complete + emulator-verified; ⏳ Task 23 (phone) |
| Slice 2 (Splash/Auth) | ✅ complete + emulator-verified; ⏳ Task 12 (phone) |
| Slice 3 code tasks (1–12) | ✅ complete, each controller-verified, committed one per task |
| Slice 3 Task 13 (emulator pass) | ✅ done 2026-09-10 — `docs/reference/verification.md` (Slice 3 section) + 46 `emu-app-*.png` |
| Slice 3 Task 14 (on-device pass, S24 Ultra) | ⏳ with Slice 1's Task 23 and Slice 2's Task 12 |
| Slice 4 (VIN scanner) Tasks 1–8 | ✅ done 2026-09-13 — spec, plan, 5 parallel implementers + 1 integrator, emulator pass; `docs/reference/verification.md` (Slice 4 section) + 8 `emu-app-scan-*.png` |
| Slice 4 Task 9 (real camera read on the S24 Ultra) | ⏳ the emulator cannot take a real still — the phone is the only place the camera read itself can be judged |
| iOS (an iPhone on Expo Go 57) | ✅ first launch 2026-09-18 after the login recipe + the route fix; ⏳ the by-eye pass of the session-8 iOS rendering paths and of the scanner on iOS |
| Test suite | 49 suites / 381 tests passing |
| `tsc --noEmit` | clean |
| Git | everything committed and pushed to `origin/main` |

## What happened this session

### Session 10 (2026-09-17/18) — the iPhone, and a Figma showcase

- **Figma showcase, no repo changes** (by your instruction): the emulator captures were laid out in
  the Figma file `GARRS_Mobile_Mockup` (`uLZ2YXXBMr7zaff6Bcya46`) — Page 1 is a grouped board of every
  screen state, Page 2 the same as individual phone panels wired into a clickable prototype (flow
  start "Recall Hub"; timers for the splash and the hub rail, drags, press-and-hold).
- **Expo Go 57 on iOS needs a login on both ends.** The earlier advice ("sign out of Expo Go") was
  wrong: Expo's changelog says Expo Go *and* the CLI must be signed in to the same account, iOS only
  for now. What finally worked: `BROWSER=none npx expo login -b` (the CLI's own browser launch
  crashes on Windows because of the `&` in its login URL; with `BROWSER=none` it just prints the URL),
  open that URL in the PC's browser, sign in, `npx expo whoami` confirms, restart Metro. An access
  token in `EXPO_TOKEN` is the alternative, but one typed over from a phone screen was rejected —
  it has to be copied. Nothing credential-like is in the repo; `npx expo logout` when the demo ends.
- **"A server with the specified hostname could not be found" on the iPhone** was the phone's
  network, not the tunnel (it resolved and answered from the PC the whole time); on the home Wi-Fi it
  loaded. The QR link page (private artifact) avoids typing the long trycloudflare hostname.
- **First iOS launch opened on expo-router's black "Unmatched Route" page.** Root cause, proved with
  a router probe in jest (mirroring `app/`'s tree): the app had no root index route, so any launch
  that reaches the router as the root path `/` matched the built-in not-found catch-all. Android
  never hit it because Expo Go there hands the router no path and the tab navigator's default
  (garage) applies; Expo Go on iOS hands over an explicit root URL. Fix: `app/index.tsx` and
  `app/+not-found.tsx`, both a `<Redirect href="/(tabs)/garage" />`. With them, every launch-URL
  variant in the probe (root, trailing slashes, `/--/`, a query string, a bogus path) lands on the
  garage. Gate unchanged: 49 suites / 381 tests, typecheck clean.

### Session 9 (2026-09-13) — Slice 4, the VIN scanner

- **You asked** to turn the demo link off and build the OCR VIN scanner with a confidence system
  (≥ 90 % → add the vehicle and pull its data; else an error asking to try again). The link was
  switched off first (its page now says so).
- **Research before design:** a scratch lab read 16 Chrome-rendered VIN plates with tesseract.js to
  get real numbers (14/16 correct; the two misses were a "1" read as "T" at 93–99 % symbol
  confidence, so the engine's confidence alone cannot be the gate — the VIN check digit is). NHTSA's
  free decode and recalls APIs were verified live and recorded as test fixtures. Expo SDK 57 API
  facts were pinned from the docs (no `ratio` prop, the WebView needs a real https origin, …).
- **Design (spec §5–§11):** tesseract.js 5 runs inside a hidden WebView (Expo Go has no native OCR
  and Hermes no WebAssembly); the score is 0.6·OCR + 0.4·structure − 3 per corrected character −
  6 per dropped character, rounded, gate 90; structure = the check digit for North-American VINs
  and NHTSA's verdict for the rest; a bounded search corrects the common 1/T, 5/S, 7/T… confusions
  when the check digit proves the fix. The screen (dark chrome, corner-marked guide, metal Capture,
  reader status, success/failure cards) is in the app's own idiom.
- **Build:** Tasks 2–6 ran in parallel (VIN library, NHTSA client, OCR engine, crop/capture, store),
  Task 7 integrated the screen and the two "Scan" entry points. Downloads: `expo-camera`,
  `expo-image-manipulator`, `react-native-webview` (SDK-pinned).
- **Emulator pass** found two things, both fixed: the crop used the window size (840 dp) while the
  camera view is 914 dp — now measured with `onLayout`; and the "added" toast covered the success
  card — it now shows as the card leaves. The emulator's still capture is a fake black frame, so
  the success path was exercised by substituting a rendered plate for the camera shot (reverted
  before committing): the in-app WebView OCR read it, NHTSA decoded a 2003 Honda Accord EX-V6 with a
  real campaign (19E-068), and the garage/recalls tabs showed it.
- Gate: 49 suites / 381 tests, typecheck clean. Everything committed per task and pushed.
- **Tesseract on the phone:** the first scan downloads ≈ 7 MB (core + model) from jsDelivr into the
  WebView's cache; later scans are instant. The phone needs internet for NHTSA anyway.

### Session 8 (2026-09-11) — follow-up

- **Remote demo link** for a phone off the Wi-Fi: a `cloudflared` quick tunnel in front of Metro
  (`EXPO_PACKAGER_PROXY_URL`), recipe in the environment notes below. Works on Android. On iOS it
  needs this PC's CLI signed in to the same Expo account as Expo Go — session 10 has the working
  recipe; the "sign out of Expo Go" advice first given here was wrong.
- **Parked decision 6 resolved:** `Geist_700Bold` was already inside the installed font package,
  so it is loaded now and the profile initials render at 700 as designed
  (`emu-app-profile.png` recaptured, matches the design).
- **iOS paths for the two Android-only effects** (unverified off Android — no iPhone yet): the
  Service map pin's glow uses the layer shadow instead of `filter: dropShadow`; the splash bubble
  highlight uses an SVG Gaussian blur instead of `filter: blur`. The SVG path was forced once on
  the emulator to check its geometry; Android's SVG blur is weaker by implementation, iOS's is
  calibrated to the web, per the library source. The auth step entrance stays a plain fade on iOS.
- Gate unchanged: 42 suites / 250 tests, `tsc --noEmit` clean. Committed and pushed.

### Session 7 (2026-09-10)

- **Research first.** The whole app artboard was read; `scripts/app-refs.mjs` captured 41 reference
  PNGs + `docs/reference/app-geometry.json` with the installed Chrome over CDP (no downloads).
  `expo-sensors` was installed for the tilt map (the README's own recommendation) — recorded in the
  ledger so you can object.
- **Spec + plan + briefs**, same flow as before: `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md`
  (8 parked decisions in §15), a 14-task plan assembled from the briefs, one fresh implementer per task.
- **Execution:** 12 implementer dispatches in four waves (haiku for fixtures and pure functions, sonnet
  for everything else), every report gated by `npm test && npm run typecheck` on the merged tree.
  Every deviation was test-only; no component code deviated from the plan.
- **Emulator pass** found two things, both fixed and committed: the tilt map never armed in Expo Go
  (its permission answer is "denied" even though the sensor streams — the gate was removed), and the
  slide-up screens showed Android's scroll indicator.
- **Architecture in one line:** tabs stay expo-router `<Tabs>`; the recall detail is a stack route
  inside the recalls tab (like stats in garage); every overlay renders in `OverlayHost` in the source's
  z-order with hardware back closing the topmost; store fields mirror the design's state; pure
  derivations live in `src/lib/*`; new primitives are `StatusChip`, `Toggle`, `ShineBorder` (baked conic
  PNG rotating behind a card), `SheetShell`, `InfiniteRail` (the garage rail generalised — the hub rail
  reuses it), `TiltMap` (`expo-sensors` DeviceMotion → `rotateX/rotateY`).

## Decisions parked (questions put aside, per your instruction)

Slice 3's are in its spec §15 and in `verification.md` under "Known, accepted differences"; **Slice 4's twelve are in its spec §16** (OCR engine choice, score weights, the 3 MB model, trusting the demo VINs, auto-add at ≥ 90, the newest recall only, no manual correction on the card, the toast timing, the odd `99% — TOO LOW` label when NHTSA rejects a locally valid VIN, …). Slice 3's:

1. Chat state lives in the chat screen, not the store (the source resets it on every open anyway).
2. The reason sheet closes on a tab switch (the source would re-show it on return).
3. The recall detail is a route; Android back pops it. Back closes every overlay (as before).
4. Hub auto-advance: 5 s interval, ticks skipped while a sheet/screen is open, never reset by a swipe (as the source).
5. Stats "Details" expands the item in the recalls list (the source's behaviour); the recall sheet's
   Details keeps switching to the tab with its toast.
6. ~~Initials at weight 600~~ — resolved in session 8: Geist 700 is loaded and used.
7. Tilt on the emulator is static; the phone judges the motion.
8. Tapping a garage row on the Profile tab opens stats with the Garage tab active (the stats route
   lives in the garage stack); the design keeps Profile highlighted.

## Resume here — the exact next steps

0. **Slice 4 Task 9 — the real camera read on the S24 Ultra.** Garage → Add Vehicle → Scan → point at
   the dashboard VIN plate (daylight, then glare, then the door-jamb sticker) → Capture. Expect the
   guide crop to contain the whole VIN (if not, the cover-fit maths in `src/ocr/crop.ts` is the
   suspect), the read within ~3 s, a score ≥ 90 for a clean plate, the decoded car and its recalls.
   If real plates score low, retune the weights in spec §16.2 (`computeScore` in `src/lib/vin.ts`).
   Also try the torch, "Type it instead" (prefills the VIN field), and the VIN-help page's sample VIN
   (it is a design placeholder with a bad check digit — the scanner trusts it on purpose, §16.4).
1. **Task 14 (Slice 3) + Task 12 (Slice 2) + Task 23 (Slice 1) — on-device pass on the S24 Ultra**,
   appended to `docs/reference/verification.md`. Easiest path: Expo Go from the Play Store,
   `npx expo start`, scan the QR. Judge by eye at 120 Hz: the two shine borders, the strip growth,
   toggles, the tilt map reacting to the phone (it should read LIVE TILT and follow the hand), the hub
   auto-advance and swipe, the article swipe both ways, chat bubbles and dots; plus the earlier slices'
   items (marquee, bubble line count, keyboard on the email field; VIN placeholder colour; rail fling).
2. **iOS by-eye pass — now reachable** (an iPhone opened the app on 2026-09-18 through the tunnel;
   recipe in Session 10 and the environment notes). Nothing beyond the launch has been judged on
   iOS yet: the session-8 iOS rendering paths (the tilt-map pin shadow, the bubble highlight's SVG
   blur), the Skia splash, the glass on Splash/Auth, the sheets, and the scanner (camera permission
   copy, the EXIF-orientation crop, the WebView OCR engine). Append findings to the iOS section at
   the end of `docs/reference/verification.md`.
3. **After that there is no next slice** — the design is fully ported. Remaining candidates are
   polish only: a shipping variant of the splash copy.

## Environment (this PC — x64 Windows 11)

Set up 2026-09-07 with the SDK command-line tools, no Android Studio:

- SDK: `%LOCALAPPDATA%\Android\Sdk` — `cmdline-tools\latest`, `platform-tools`,
  `emulator`, `platforms\android-35`, the **x86_64** API 35 Google Play image.
- JDK: Temurin 17 at `%LOCALAPPDATA%\Android\jdk17`.
- `ANDROID_HOME`, `JAVA_HOME` and PATH are **user** env vars → only in new
  shells. In an already-open shell use absolute paths:
  `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"`,
  `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe"`.
- AVD **`s24ultraProxy`**: Pixel 8, x86_64 API 35 Play, `hw.keyboard=no`, WHPX
  acceleration confirmed, cold boot ≈ 25–50 s. Expo Go 57.0.9 is installed on it
  with its floating "Tools" button turned off. If a previous instance died, the next launch shows a
  crash-consent dialog and never boots: delete `%LOCALAPPDATA%\Temp\AndroidEmulator\emu-crash-*.db`
  and launch with `-no-metrics`.
- **Run recipe:** boot the AVD, then
  `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` (never with `CI=1` — that disables watch
  mode and typed-route generation), `adb reverse tcp:8081 tcp:8081`, and open `exp://127.0.0.1:8081`
  on the device. **Never** `expo start --localhost`. If Expo Go shows "Something went wrong", tap its
  reload. Re-sending the `exp://` intent to a running app triggers a full reload.
- **Phone off the Wi-Fi (remote demo):** Expo's own `npx expo start --tunnel` failed on 2026-09-10 with ngrok `ERR_NGROK_108` (Expo's shared anonymous ngrok account at its session limit — nothing on this PC). Working alternative with the already-installed `cloudflared`: `cloudflared tunnel --url http://localhost:8081 --no-autoupdate` prints an `https://<random>.trycloudflare.com` URL; then `EXPO_PACKAGER_PROXY_URL=https://<random>.trycloudflare.com npx expo start` makes the manifest and bundle URLs point at the tunnel; on the phone open Expo Go → "Enter URL manually" → `exp://<random>.trycloudflare.com`. Verified from this PC: the manifest and the 12 MB Android bundle come through the tunnel. The hostname changes every time cloudflared restarts. **iPhone:** Expo Go on iOS has no URL field — paste the `exp://` link into Safari and choose Open (or scan a QR of it with the Camera). **Expo Go 57 on iOS requires the CLI to be signed in to the same Expo account as Expo Go** ("You're signed in to Expo Go as X, but not signed in to Expo CLI"); signing out of Expo Go does not help, and Android is not gated yet. Recipe (2026-09-18): `BROWSER=none npx expo login -b` prints a login URL (the CLI's own Windows browser launch crashes on the `&` in it), open that URL in the PC's browser and sign in, `npx expo whoami` confirms, then (re)start Metro; the session lives in `~/.expo/state.json`, never in the repo — `npx expo logout` when done. A personal access token in `EXPO_TOKEN` works too, but only pasted from a copy button: one typed over from a phone screen was rejected as invalid. The iPhone on mobile data could not resolve the trycloudflare hostname; on the home Wi-Fi it could. **Keep them alive (2026-09-12):** when launched as Claude Code background tasks, both cloudflared and Metro were killed by the session's low-memory guard (twice, with 9 GB free); launch them detached instead — PowerShell `Start-Process` on `cloudflared.exe` (stderr redirected to a log) and on `cmd.exe /c "set EXPO_PACKAGER_PROXY_URL=…  npx expo start > log 2>1"` from the repo directory. They then outlive the session; stop them with `Stop-Process` on `cloudflared.exe` and the `node.exe` that holds port 8081.
- Soft keyboard: for scripted typing disable Gboard first (`adb shell ime disable …LatinIME`); it
  re-enables itself after every reboot.
- Chrome is installed (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and is what
  `scripts/splash-refs.mjs` and `scripts/app-refs.mjs` drive over CDP for the design references.
- More driving notes (tap points, sequences) at the bottom of each section of `docs/reference/verification.md`.

## Commands

| | |
|---|---|
| `npm test` | jest-expo; single file with `npm test -- <pattern>` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run android` | Expo Go on the booted emulator / USB device |
| `npx expo start` | dev server; scan the QR with Expo Go on the phone (no SDK needed) |
| `npm run build-glyphmap` | regenerate the Remixicon glyph map |
| `npm run bake-assets` | bake the metal / glow PNGs, the four auth blobs and the two shine ramps (pure Node + `pngjs`) |
| `npm run serve-design` | static server for the design HTML, port 4173 |
| `node scripts/splash-refs.mjs` / `node scripts/app-refs.mjs` | re-capture the design references (needs internet + Chrome) |
| `node scripts/emu-splash-shots.mjs <x> <y> [state…]` | timed splash captures via the REPLAY pill |
| `node scripts/emu-app-shots.mjs "tap X Y" "sleep MS" "shot NAME" …` | drive the emulator through a sequence and capture |

The gate after every task is `npm test && npm run typecheck`, re-run by the
controller rather than trusted from the implementer's report.

## Standing rules from the user

- **Subagent-driven, one fresh implementer per task, no reviewer dispatches** —
  "no need to review, you're making the design I already created."
- **No Playwright / Chromium download.** Design references come from the installed Chrome over
  CDP; image assets are baked in pure Node with `pngjs`.
- **Approved downloads so far:** Expo Go; the Android SDK components and JDK (2026-09-07); npm
  packages `@shopify/react-native-skia` and `@expo-google-fonts/instrument-serif` (2026-09-09);
  `expo-sensors` (2026-09-10, implied by "get the rest of the app functional for the demo" — the
  README names it for the tilt map; object if that was wrong); `@expo/ngrok` (2026-09-10, asked for a
  remote link — Expo's tunnel then failed on Expo's side, see the environment notes). Anything else: ask.
- **Git is allowed** and pushes are wanted — the user reads the repo from another machine.
  A user file `Recording 2026-09-10 011300.mp4` sits untracked at the repo root; it was never committed.
- **Questions are parked, not asked** — written into the spec's "parked decisions" and
  `verification.md`, with the choice made on the user's behalf recorded so it can be overruled.

## Privacy change made during the first push (2026-09-06)

The repo is **public**. The handoff photographs are the user's own pictures of
their car and showed a **fully legible licence plate**. Before the first commit
the plate was destroyed (downsampled to a coarse mosaic, then blurred, behind a
feathered mask) in all five files that contained it:

```
design_handoff_recall_hub/design/assets/crash.png       box (228, 448)-(334, 520)
design_handoff_recall_hub/design/assets/crash-hero.jpg  box (203, 400)-(301, 466)
design_handoff_recall_hub/design/assets/tile-1.jpg      box  (76,  88)-(134, 124)
design_handoff_recall_hub/design/assets/tile-2.jpg      box (140,   0)-(210,  18)
design_handoff_recall_hub/design/assets/tile-3.jpg      box   (0,  63)- (58, 105)
```

`tile-4.jpg` and `tile-5.jpg` never showed the plate and are untouched. The copies now in
`src/assets/images/` (tiles + `crash-hero.jpg`) are byte-for-byte the redacted files.
**The unredacted originals were never committed.**

## Where the authority lives

1. `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (app tabs),
   `…/2026-09-09-slice2-splash-design.md` (Splash) and `…/2026-09-05-slice1-foundation-garage-design.md`
   (Garage) — the approved specs. Binding when a plan disagrees.
2. `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`, `…/2026-09-09-slice2-splash.md`,
   `…/2026-09-05-slice1-foundation-garage.md` — the task plans. Dispatch tasks from their extracted
   `task-N-brief.md`, never by pasting the plan.
3. `design_handoff_recall_hub/design/GaragePrototype.dc.html` and `Splash.dc.html` — the real
   source of truth for **every measurement**. Everything is inline-styled, so the way to find an
   element is to search the file for its copy string and read the styles off it.
   `docs/reference/app-geometry.json` and `splash-geometry.json` are the measured DOMs at 430×932.
4. `design_handoff_recall_hub/README.md` — a good spec, but prose written about
   the code. **The code wins**; it understates at least the liquid-metal button
   and never mentions the vehicle-stats screen.
5. `CLAUDE.md` — for where that README is wrong.
6. `docs/reference/verification.md` — what the emulator actually showed for all three slices, and
   the open decisions.
