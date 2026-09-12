# Where we left off

**Last updated: 2026-09-11, session 8** — a short follow-up to session 7, which built and
emulator-verified **Slice 3, the rest of the app** (Recalls, Service, Hub, Profile and every overlay
between them). Session 8 added the remote demo link, Geist 700 for the initials, and iOS rendering
paths for the two Android-only effects (see "Session 8" below).

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
| Slice 3 Task 14 (on-device pass, S24 Ultra) | ⏳ the only remaining task — do it together with Slice 1's Task 23 and Slice 2's Task 12 |
| Test suite | 42 suites / 250 tests passing |
| `tsc --noEmit` | clean |
| Git | everything committed and pushed to `origin/main` |

## What happened this session

### Session 8 (2026-09-11) — follow-up

- **Remote demo link** for a phone off the Wi-Fi: a `cloudflared` quick tunnel in front of Metro
  (`EXPO_PACKAGER_PROXY_URL`), recipe in the environment notes below. Works on Android. On iOS,
  a signed-in Expo Go refuses it because this PC's Expo CLI is not logged in — the phone user
  signs out of Expo Go, or the CLI logs in as the same account (your credentials; not done here).
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

All in the spec's §15 and in `verification.md` under "Known, accepted differences":

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

1. **Task 14 (Slice 3) + Task 12 (Slice 2) + Task 23 (Slice 1) — on-device pass on the S24 Ultra**,
   appended to `docs/reference/verification.md`. Easiest path: Expo Go from the Play Store,
   `npx expo start`, scan the QR. Judge by eye at 120 Hz: the two shine borders, the strip growth,
   toggles, the tilt map reacting to the phone (it should read LIVE TILT and follow the hand), the hub
   auto-advance and swipe, the article swipe both ways, chat bubbles and dots; plus the earlier slices'
   items (marquee, bubble line count, keyboard on the email field; VIN placeholder colour; rail fling).
2. **After that there is no next slice** — the design is fully ported. Remaining candidates are
   polish only: a shipping variant of the splash copy, and iOS verification when an iPhone or a Mac
   is available (the iOS rendering paths from session 8 have never been seen on iOS).

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
- **Phone off the Wi-Fi (remote demo):** Expo's own `npx expo start --tunnel` failed on 2026-09-10 with ngrok `ERR_NGROK_108` (Expo's shared anonymous ngrok account at its session limit — nothing on this PC). Working alternative with the already-installed `cloudflared`: `cloudflared tunnel --url http://localhost:8081 --no-autoupdate` prints an `https://<random>.trycloudflare.com` URL; then `EXPO_PACKAGER_PROXY_URL=https://<random>.trycloudflare.com npx expo start` makes the manifest and bundle URLs point at the tunnel; on the phone open Expo Go → "Enter URL manually" → `exp://<random>.trycloudflare.com`. Verified from this PC: the manifest and the 12 MB Android bundle come through the tunnel. The hostname changes every time cloudflared restarts. **iPhone:** Expo Go on iOS has no URL field — paste the `exp://` link into Safari and choose Open (or scan a QR of it with the Camera). A **signed-in** Expo Go on iOS refuses a project whose dev server is not logged in to the same Expo account ("You're signed in to Expo Go as X, but not signed in to Expo CLI"; `npx expo whoami` on this PC says "Not logged in"): either the phone user signs out of Expo Go (Profile → Log out) and reopens the link, or the CLI runs `npx expo login` as that account before Metro starts — the credentials are the user's, so this was not done here (2026-09-11). **Keep them alive (2026-09-12):** when launched as Claude Code background tasks, both cloudflared and Metro were killed by the session's low-memory guard (twice, with 9 GB free); launch them detached instead — PowerShell `Start-Process` on `cloudflared.exe` (stderr redirected to a log) and on `cmd.exe /c "set EXPO_PACKAGER_PROXY_URL=…  npx expo start > log 2>1"` from the repo directory. They then outlive the session; stop them with `Stop-Process` on `cloudflared.exe` and the `node.exe` that holds port 8081.
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
