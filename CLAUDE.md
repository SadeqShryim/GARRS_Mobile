# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active work — resume here first

**Slice 2 (the real Splash) is code complete and emulator-verified** as of 2026-09-10 (session 6): Tasks 1–11 done (33 jest suites / 168 tests, typecheck clean); the Slice 2 section of `docs/reference/verification.md` is the fidelity record and `docs/reference/emu-splash-*.png` the captures. Only **Task 12** (on-device pass on the S24 Ultra, appended to `verification.md`) remains — do it together with Slice 1's Task 23. Four decisions are parked in the Slice 2 spec §15 / `verification.md` "NOT fixed" (first-run marquee scroll; auth glass backdrop blur; back on the email step; the bubble's two-line wrap at 412 dp, resolved as the design's own behaviour at that width). Before doing anything else, read, in this order:

0. `WHERE-WE-LEFT-OFF.md` at the repo root — the plain-language handoff note.
1. `.superpowers/sdd/2026-09-09-slice2-splash/progress.md` — the Slice 2 execution ledger; its **RESUME HERE** section is authoritative. (Slice 1's ledger is `.superpowers/sdd/2026-09-05-slice1-foundation-garage/progress.md`.)
2. `docs/superpowers/plans/2026-09-09-slice2-splash.md` — the 12-task plan (complete code in every task; briefs in the ledger directory). Slice 1's plan is `docs/superpowers/plans/2026-09-05-slice1-foundation-garage.md`.
3. `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` and `…/2026-09-05-slice1-foundation-garage-design.md` — the approved specs; binding when plan and spec disagree.

Execution mode, by the user's explicit instruction: **subagent-driven, one fresh implementer per task, no reviewer dispatches** ("no need to review, you're making the design I already created"), **no Playwright npm/Chromium download** (design references: `scripts/splash-refs.mjs` drives the installed Chrome over CDP; Slice 1 used the Playwright MCP; assets are baked in pure Node with `pngjs`). Each task's gate is `npm test && npm run typecheck`, which the controller re-runs itself; implementers never run git — the controller commits per task with the checkpoint message and pushes at session end. Questions are parked in the spec/verification docs rather than asked. The repo is public at <https://github.com/SadeqShryim/GARRS_Mobile> (`main`). Approved downloads: Expo Go onto the emulator, the SDK/JDK, and the npm packages `@shopify/react-native-skia` + `@expo-google-fonts/instrument-serif`; nothing else without asking.

Environment on the current machine (x64 Windows 11, set up 2026-09-07 without Android Studio): SDK at `%LOCALAPPDATA%\Android\Sdk` (`cmdline-tools\latest`, `platform-tools`, `emulator`, `platforms\android-35`, `system-images\android-35\google_apis_playstore\x86_64`), Temurin JDK 17 at `%LOCALAPPDATA%\Android\jdk17`; `ANDROID_HOME`, `JAVA_HOME` and the PATH entries are **user** env vars (new shells only — in an already-open shell call `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"` and `.../emulator/emulator.exe` by absolute path). AVD **`s24ultraProxy`** = Pixel 8 on the x86_64 API 35 Google Play image, `hw.keyboard=no`, Expo Go 57.0.9 installed, WHPX acceleration confirmed. To run: boot the AVD, then `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` + `adb reverse tcp:8081 tcp:8081` + open `exp://127.0.0.1:8081` on the device — never `expo start --localhost` (it binds `[::1]` only, unreachable through adb reverse). More emulator-driving facts (including the Gboard/`input text` quirk and the REPLAY tap point) are in `docs/reference/verification.md`. Chrome is installed for the reference captures.

The app commands are: `npm test` (jest-expo), `npm run typecheck` (`tsc --noEmit`), `npm run android` (Expo Go on the booted emulator), `npm run build-glyphmap`, `npm run bake-assets` (metal bezels, glow blob, the four auth blobs), `npm run serve-design` (static server for the design HTML, port 4173), `node scripts/splash-refs.mjs` (Splash design references), `node scripts/emu-splash-shots.mjs` (timed emulator captures). Run a single test file with `npm test -- <pattern>`.

## What this repo is right now

**An Expo / React Native app mid-port, alongside the design handoff it is being ported from.** (This section used to say "a design handoff, not an application" — that stopped being true when Slice 1 landed.)

- `app/`, `src/`, `scripts/`, `package.json` — the Expo app. Slice 1 (Foundation + Garage tab) and Slice 2 (the real Splash/Auth, Skia-driven) are code-complete and emulator-verified: 33 jest suites / 168 tests, `tsc --noEmit` clean.
- `design_handoff_recall_hub/` — the exported, completed prototype of **Recall Hub**, a vehicle safety-recall app (splash → auth → 5-tab app), authored in Claude Design. Still the reference; still not something to copy code from.
- `docs/` — both specs, both plans, the reference screenshots at 430×932 (11 Garage states, 15 Splash states + `splash-geometry.json`), the emulator captures, and `verification.md`.
- `.superpowers/sdd/…` — the execution ledger and the per-task briefs and reports.

Only the Splash/Auth flow and the Garage tab are ported. The other four tabs render the design's own `NOT IN THIS PROTOTYPE YET` stub — not an isolation for the splash work, simply later slices. To view the design as intended, run `npm run serve-design` (port 4173) or open `design_handoff_recall_hub/design/GaragePrototype.dc.html` in a browser — it needs `support.js` alongside it (it is) and **an internet connection**, since fonts, Remixicon, and React all load from CDNs and nothing is vendored.

## The `.dc.html` format

The two artboards are **design references authored in HTML**, not production code to copy. They run in a small in-house runtime (`support.js`, ~69 KB): each `.dc.html` holds a template (HTML with `{{ }}` value holes, `<sc-for>`, `<sc-if>`) plus a `class Component extends DCLogic` with React class-component semantics — `state`, `setState`, `componentDidMount` — whose `renderVals()` supplies the interpolated values.

Two properties make the port tractable: **all styling is inline `style="…"` with no stylesheets or CSS classes**, and **the logic class is already React**. `README.md` in the handoff folder has a full translation table.

`design/support.js` is **reference only — do not port it.**

## Authoritative sources, in order

1. `design_handoff_recall_hub/design/GaragePrototype.dc.html` — the real source of truth for **every measurement**. Because everything is inline-styled, the reliable way to find an element is to **search the file for its copy string**, then read the styles off it.
2. `design_handoff_recall_hub/README.md` — an excellent 260-line spec (timelines, tokens, state shape, Expo porting table). Read it before any port work.
3. This file — for where the README is wrong.

**The README is prose written about the code; the code wins.** It understates at least one component materially (see below). Verify against the HTML before acting on a README description.

## Fidelity mandate

The design is finished and approved. Recreate it **pixel-faithfully** — do not redesign, re-space, or "improve" layouts. Where a platform genuinely cannot reproduce an effect, match the *intent* and **flag it explicitly** rather than quietly substituting a different look.

The design frame is 430 × 932 (iPhone 16 Pro Max logical size). All internal measurements are already device-independent points — use them as-is. On port, drop the fixed frame and 30px radius and use `SafeAreaView`.

## Effect feasibility (verified 2026-09-05, against live docs)

Researched because these effects were the main perceived port risk. **They are not the risk.** Do not re-derive this.

- **Liquid metal buttons — fully achievable, Expo Go.** The README calls this "a chrome gradient plus a drifting blob layer." It is not. `metalPill()` (`GaragePrototype.dc.html:2131`) is a **static conic gradient that only rotates** — a `width × 2.4` sweep ramp blurred 1.5px, spinning on a linear loop behind a face inset by 2px, so only a 2px chrome bezel is ever visible. Nothing about the gradient itself animates. Pre-bake it as a PNG and rotate it with Reanimated; Skia is unnecessary. Hover/press only change loop duration (7s → 4.1s → 2.33s).
- **Glass — achievable, Expo Go.** `expo-blur` does true backdrop blur and ships in Expo Go. `expo-glass-effect` (`<GlassView>`) gives real Apple Liquid Glass on **iOS 26+**, also in Expo Go. The README's claim that this needs `expo prebuild`/EAS is **outdated**. The 26 inset shadows map to RN 0.76+ `boxShadow` (supports `inset`); `filter: blur()` is now a real RN style prop.
- **Skia is bundled in Expo Go** (`@shopify/react-native-skia`), contrary to common assumption. Expo Go pins its version to the SDK.
- **Most "glass" in the app tabs is cosmetic.** Those fills are `rgba(255,255,255,0.82)` under `blur(24px)` — at 82% opacity over a white background the blur is near-invisible. Only **3** backdrop-filters in the whole app file sit on genuinely translucent (<0.5 alpha) fills. The glass that matters is on Splash/Auth (`.10`–`.22` alpha), and the backdrop there is **static** (an already-blurred photo plus slow blobs), which is the easy case.
- **Sheets are a plain `translateY(100%) → 0` slide; the scrim has a `blur(2px)`** (`sheetShell()`, line 2206 — the scrim is `rgba(23,22,26,.28)`, so don't grep for black). Render sheets and full-screen overlays as absolutely-positioned views in the root layout, **not** via RN `<Modal>` — that sidesteps a known Android bug where blur cannot cross a Modal boundary, and matches the design's z-index stacking.
- **Tapping a vehicle card opens a "vehicle stats" screen** (`isStats`, template line 275; `statsFor()`, line 1380) — animated SVG health ring plus count-up, four tiles, maintenance bars. It replaces tab content in place, no slide. The README never mentions it.
- **Non-Garage tabs have a designed stub** (`isStub`, line 712: `NOT IN THIS PROTOTYPE YET`). Use it for unported tabs instead of inventing a placeholder.

### The actual risks

- **Splash motion blur — built in Slice 2 exactly this way.** A blur ramping 0→16px over 84 tiles moving at ~3255 px/s, drawn inside one Skia `<Canvas>` with the blur on a layer group nested *inside* the zoom/rotate group (Skia saves the layer before applying the group transform, and CSS applies `filter` before `transform`). Two Skia facts that matter: `expo-blur` cannot sample anything drawn by Skia (or by RN `filter`), so the bubble's backdrop blur+saturate is a Skia `BackdropFilter` in the same canvas; and the source runtime never scrolls the marquee on its first run (row refs attach late) — the port scrolls every run.
- **Android below 12 is the platform floor.** Backdrop blur, `filter: blur`, and inset shadows all degrade there together.
- **`saturate(1.6)` has no `expo-blur` equivalent.** Compensate in the gradient tint. Minor.

## Verification

**The demo device is a Samsung S24 Ultra** (Android 14+, ~412dp logical width, 120Hz). Android is the primary verification target until an iPhone is available; treat iOS as secondary for now. Derive layout from device width — the design's 430pt frame is wider than the phone — and paint the Android gesture-nav inset white beneath the tab bar.

Appearance and frame rate need different tools, and simulators lie about the second one.

- **Android emulator + ADB works on Windows** — `adb shell input tap x y`, `adb exec-out screencap -p`. This is the closest analogue to the browser loop and can verify layout, the tab bar hump, sheets, and most glass.
- **iOS needs macOS** (an M1 is fine): `xcrun simctl io booted screenshot`, plus Maestro or `idb ui tap` for interaction. Liquid Glass is unverifiable off iOS 26.
- **Expo web is a trap for this design.** It renders through `react-native-web`, so blur, shadows, and Skia will not match the native build. Useful for navigation and layout logic only.
- **Frame rate cannot be verified from screenshots or on a simulator.** The splash risk needs a profiler on real, ideally budget, Android hardware.

## Porting notes

- All demo content is hardcoded in the logic class — `ARTICLES`, `LIGHTS` (20 dashboard lights), `TABS`, `PLANS`, `CHAT_SCRIPT`, `DECODE`, `DEMO_VIN`, `state.vehicles`. **Lift these into typed fixtures verbatim** so the demo reads identically.
- Isolate the platform-divergent work behind roughly five primitives — metal button, glass surface, dot pattern, blur backdrop, marquee. Everything else is plain RN that behaves identically across platforms, which keeps iOS-specific verification to a few files.
- Icons are **Remixicon 4.5.0** referenced by class. If mapping to `@expo/vector-icons` instead of `react-native-remix-icon`, **check every glyph visually** — the warning telltales carry meaning.
- Fonts: Geist, Geist Mono, Instrument Serif via `expo-font` / `@expo-google-fonts/*`.
- `assets/crash.png` is the user's own photograph, not licensed stock. It is the unreferenced original; the artboards use `crash-hero.jpg` and `tile-1…5.jpg`.
- The splash copy `Did you f*cking check?` will affect App Store age rating. Fine for the demo; a shipping variant is needed.
