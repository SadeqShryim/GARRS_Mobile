# Where we left off

**Last updated: 2026-09-10, end of session 6** — the session that built and emulator-verified
**Slice 2, the real Splash**.

Read this, then `.superpowers/sdd/2026-09-09-slice2-splash/progress.md` (the Slice 2
execution ledger). If the two disagree, the ledger is newer and wins. The Slice 1 ledger
(`.superpowers/sdd/2026-09-05-slice1-foundation-garage/progress.md`) is closed except for
its Task 23 (phone pass).

---

## One-paragraph summary

**Recall Hub** is a vehicle safety-recall app. It exists as a finished, approved prototype
authored in Claude Design (`design_handoff_recall_hub/`), and is being ported to
**Expo / React Native**. Slice 1 (Foundation + Garage tab) shipped in sessions 1–5. This
session planned and executed **Slice 2 — the real Splash**: the accelerating motion-blurred
marquee, the crash-photo cut, the liquid-glass bubble, and the three-step auth screen over
drifting blobs, replacing the Slice 1 stub. All ten code tasks are done and verified on the
emulator against reference captures of the design. Only the on-device pass on the phone
remains for both slices.

## Status at a glance

| | |
|---|---|
| Slice 1 (Garage) | ✅ complete + emulator-verified; ⏳ Task 23 (phone) |
| Slice 2 code tasks (1–10) | ✅ complete, each controller-verified, committed one per task |
| Slice 2 Task 11 (emulator pass) | ✅ done 2026-09-10 — `docs/reference/verification.md` (Slice 2 section) + 16 `emu-splash-*.png` |
| Slice 2 Task 12 (on-device pass, S24 Ultra) | ⏳ the only remaining task — do it together with Slice 1's Task 23 |
| Test suite | 33 suites / 168 tests passing |
| `tsc --noEmit` | clean |
| Git | everything committed and pushed to `origin/main` |

## What happened this session

- **Research first.** The design's `Splash.dc.html` was captured at 430×932 with the installed
  Chrome over CDP (`scripts/splash-refs.mjs`, no downloads): 15 reference PNGs and a DOM
  geometry dump (`docs/reference/splash-geometry.json`). Two surprises: the source runtime never
  scrolls the marquee on its very first run (only after REPLAY — the row refs attach late), and the
  bubble copy is exactly one line at 430 with zero slack.
- **Skia proven before planning.** `@shopify/react-native-skia` 2.6.2 (bundled in Expo Go 57)
  was probed on the emulator: image tiles, a Remixicon glyph from the TTF, a shared-value blur
  layer under a rotation, and a composed blur + saturate backdrop filter all render. Installed
  it and `@expo-google-fonts/instrument-serif` (npm only).
- **Spec + plan + briefs**, same flow as Slice 1: `docs/superpowers/specs/2026-09-09-slice2-splash-design.md`
  (measurements from the DOM dump, effects table, 4 parked decisions), a 12-task plan with
  complete code, briefs extracted into the ledger.
- **Execution:** 10 implementer dispatches in four waves (haiku for transcription, sonnet for the
  rest), every report gated by `npm test && npm run typecheck` on the merged tree. Four
  test-only deviations (react-native-svg colour processing, a strict-TS helper type, two React 19
  `act()` needs) — no component code deviated from the plan.
- **Emulator pass** found two things, both fixed and committed: Skia's deprecated `SkPath.close()`
  (now `PathBuilder`), and the bubble copy wrapping at 411 dp — the source's CSS would wrap it
  left-aligned as "Did you / f*cking check?" (`text-wrap: pretty`), which is now emulated with a
  no-break space; one line on wider screens.
- **Architecture in one line:** one Skia `<Canvas>` (marquee with a blur layer nested inside the
  zoom/rotate group, vignette, the photo with a live blur/colour-matrix, veil, the bubble's backdrop
  filter) under plain RN layers (mark, blobs, bubble face, auth panel, REPLAY); a `setTimeout`
  phase machine mirrors the source's `run()`, every CSS transition is a Reanimated `withTiming`,
  and the marquee runs on the UI thread from `useFrameCallback`.

## Decisions parked (questions put aside, per your instruction)

All in the spec's §15 and in `verification.md` under "NOT fixed":

1. **First-run marquee.** The port scrolls on every run (the code's intent, the README, and the
   CLAUDE.md analysis all say "accelerating marquee"); the source's first run only zooms + blurs
   because of a runtime quirk. One constant (speed × 0 on run 1) flips it.
2. **Auth glass backdrop blur** omitted — invisible over an already-blurred backdrop, and it would
   cost four full-screen blur snapshots per frame over animating blobs.
3. **Hardware back on the email step exits the app** (the design has no back there); on the
   password/confirm steps it goes back a step (an addition, like Slice 1's overlay fix).
4. **Bubble at 412 dp** — resolved as described above; the design-at-412 behaviour, not the
   430 look. Say so if you'd rather force one line (e.g. by trimming the side padding).

## Resume here — the exact next steps

1. **Task 12 (Slice 2) + Task 23 (Slice 1) — on-device pass on the S24 Ultra**, appended to
   `docs/reference/verification.md`. Easiest path: Expo Go from the Play Store, `npx expo start`,
   scan the QR. Watch a cold launch and three REPLAYs at 120 Hz (the emulator's ~50 fps is a
   lower bound — the marquee's frame rate can only be judged on the phone); check the bubble's
   line count, the keyboard on the email field, and back on the password step. Also settle
   Slice 1's two parked items (VIN placeholder colour; fast rail fling).
2. **Then Slice 3.** No spec or plan exists yet — same flow (brainstorm → spec → plan → briefs).
   Candidates: the four stub tabs (Recalls, Service, Hub, Profile), the concierge chat, the
   recall detail screen.

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
  with its floating "Tools" button turned off.
- **Run recipe:** boot the AVD, then
  `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start`,
  `adb reverse tcp:8081 tcp:8081`, and open `exp://127.0.0.1:8081` on the
  device (`npm run android` also works once the emulator is up — keep the env
  var). **Never** `expo start --localhost`: it binds `[::1]` only, which
  `adb reverse` cannot reach. If Expo Go shows "Something went wrong", tap its
  reload. Re-sending the `exp://` intent to a running app triggers a full reload.
- Soft keyboard: opens with the add sheet; one back press hides it. For scripted typing into
  the auth fields, disable Gboard first (`adb shell ime disable …LatinIME`) — its floating IME
  drops composing text when focus moves. Gboard re-enables itself after every reboot.
- Chrome is installed (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and is what
  `scripts/splash-refs.mjs` drives over CDP for the design references.
- More driving notes at the bottom of each section of `docs/reference/verification.md`.

## Commands

| | |
|---|---|
| `npm test` | jest-expo; single file with `npm test -- <pattern>` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run android` | Expo Go on the booted emulator / USB device |
| `npx expo start` | dev server; scan the QR with Expo Go on the phone (no SDK needed) |
| `npm run build-glyphmap` | regenerate the Remixicon glyph map |
| `npm run bake-assets` | bake the metal / glow PNGs and the four auth blobs (pure Node + `pngjs`) |
| `npm run serve-design` | static server for the design HTML, port 4173 |
| `node scripts/splash-refs.mjs` | re-capture the Splash design references (needs internet + Chrome) |
| `node scripts/emu-splash-shots.mjs <x> <y> [state…]` | timed emulator captures via the REPLAY pill |

The gate after every task is `npm test && npm run typecheck`, re-run by the
controller rather than trusted from the implementer's report.

## Standing rules from the user

- **Subagent-driven, one fresh implementer per task, no reviewer dispatches** —
  "no need to review, you're making the design I already created."
- **No Playwright / Chromium download.** Design references come from the installed Chrome over
  CDP (`scripts/splash-refs.mjs`) or, in Slice 1, the Playwright MCP; image assets are baked in
  pure Node with `pngjs`.
- **Approved downloads so far:** Expo Go; the Android SDK components and JDK
  needed for the emulator (asked for on 2026-09-07); npm packages `@shopify/react-native-skia`
  and `@expo-google-fonts/instrument-serif` (2026-09-09, implied by "start slice 2 with the real
  splash screen" — object if that was wrong). Anything else: ask.
- **Git is allowed** and pushes are wanted — the user reads the repo from
  another machine.
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

1. `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` (Splash) and
   `docs/superpowers/specs/2026-09-05-slice1-foundation-garage-design.md` (Garage) — the approved
   specs. Binding when a plan disagrees.
2. `docs/superpowers/plans/2026-09-09-slice2-splash.md` and `…/2026-09-05-slice1-foundation-garage.md`
   — the task plans, with complete code in every task. Dispatch tasks from their extracted
   `task-N-brief.md`, never by pasting the plan.
3. `design_handoff_recall_hub/design/Splash.dc.html` and `GaragePrototype.dc.html` — the real
   source of truth for **every measurement**. Everything is inline-styled, so the way to find an
   element is to search the file for its copy string and read the styles off it.
   `docs/reference/splash-geometry.json` is the measured DOM of the Splash at 430×932.
4. `design_handoff_recall_hub/README.md` — a good spec, but prose written about
   the code. **The code wins**; it understates at least the liquid-metal button
   and never mentions the vehicle-stats screen.
5. `CLAUDE.md` — for where that README is wrong.
6. `docs/reference/verification.md` — what the emulator actually showed for both slices, and
   the open decisions.
