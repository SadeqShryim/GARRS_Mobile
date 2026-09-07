# Where we left off

**Last updated: 2026-09-07, end of session 5** — the session that set up the emulator on the new PC and finished the Slice 1 verification pass.

Read this, then `.superpowers/sdd/2026-09-05-slice1-foundation-garage/progress.md`
(the execution ledger). If the two disagree, the ledger is newer and wins.

---

## One-paragraph summary

**Recall Hub** is a vehicle safety-recall app. It exists as a finished, approved
prototype authored in Claude Design (`design_handoff_recall_hub/`), and is being
ported to **Expo / React Native**. We are executing **Slice 1 — Foundation +
Garage tab** from a written 23-task plan. **Every code task is done and the app
has now been verified on an Android emulator** against the design's reference
screenshots. The only thing left in Slice 1 is the pass on the physical phone.

## Status at a glance

| | |
|---|---|
| Slice 1 code tasks (1, 3–21 + overlay mount) | ✅ complete, each controller-verified |
| Task 2 (emulator smoke test) | ✅ done 2026-09-07 — `docs/reference/emu-smoke.png` |
| Task 22 (emulator fidelity pass) | ✅ done 2026-09-07 — `docs/reference/verification.md` + 12 `emu-*.png` |
| Test suite | 23 suites / 116 tests passing |
| `tsc --noEmit` | clean |
| Task 23 (on-device pass, S24 Ultra) | ⏳ the only remaining Slice 1 task |
| Git | everything committed and pushed to `origin/main` |

## What happened this session

- **Web pre-pass** (Expo web in headless Chrome, no downloads): every screen's
  copy and punctuation verified from the DOM. Two web-only rendering gaps
  (masked-view's web shim drops its children; inactive tab scenes show through
  the transparent tab background) are documented in `verification.md` — they do
  not occur on Android.
- **Emulator built from scratch** on this PC without Android Studio (see
  "Environment"). The app boots in Expo Go and every reference state was
  captured and compared.
- **Two real fixes** came out of the pass: the VIN-help **Scan** button had its
  camera icon after the label (design: before), and the Android **back button
  exited the app** while a sheet or VIN help was open (now closes the overlay;
  test added).
- **Blur tokens settled:** `blur.face = 55`, `blur.scrim = 7` in
  `src/theme/tokens.ts`, tuned with side-by-side crops against the references.
- **Splash:** you noticed the splash page and its animation are not shown. That
  is by spec — Slice 1 ships a *splash stub*; the real Splash/Auth (accelerating
  photo marquee with motion blur, crash photo, liquid-glass bubble) is out of
  Slice 1 and slated for slice 6, because it needs Skia. The stub exposes the
  same `onDone` contract so the real one swaps in place.

## Decisions parked (questions put aside, per your instruction)

Both are recorded in `docs/reference/verification.md` under "NOT fixed":

1. **VIN placeholder colour.** The design sets none, so the reference shows the
   browser default `#757575`; the app uses the palette token `ink7` (#9A99A2),
   which is lighter. Left as `ink7`. One-line change in `AddVehicleSheet.tsx`
   if you want the literal match.
2. **Fast rail fling.** A fast synthetic `adb` swipe did not advance the rail
   (slow drags and the pager dots do). Almost certainly an input-injection
   artefact — check with a finger on the phone before calling it a bug.

## Resume here — the exact next steps

1. **Task 23 — on-device pass on the S24 Ultra**, appended to
   `docs/reference/verification.md`. Easiest path: install Expo Go from the
   Play Store, run `npx expo start`, scan the QR (no adb needed). USB works too:
   `adb devices`, then the same recipe as the emulator below. While there,
   settle the two parked decisions by finger/eye.
2. **Then Slice 2.** No spec or plan exists yet — same flow as Slice 1
   (brainstorm → spec → plan → briefs). The real Splash is an obvious candidate
   since it is the first thing you noticed missing.

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
  acceleration confirmed, cold boot ≈ 50 s. Expo Go 57.0.9 is installed on it
  with its floating "Tools" button turned off.
- **Run recipe:** boot the AVD, then
  `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start`,
  `adb reverse tcp:8081 tcp:8081`, and open `exp://127.0.0.1:8081` on the
  device (`npm run android` also works once the emulator is up — keep the env
  var). **Never** `expo start --localhost`: it binds `[::1]` only, which
  `adb reverse` cannot reach. If Expo Go shows "Something went wrong", tap its
  reload — it opened before Metro was listening.
- Soft keyboard opens with the add sheet; one back press hides it without
  closing the sheet. Gboard re-enables itself after every reboot.
- More driving notes at the bottom of `docs/reference/verification.md`.

## Commands

| | |
|---|---|
| `npm test` | jest-expo; single file with `npm test -- <pattern>` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run android` | Expo Go on the booted emulator / USB device |
| `npx expo start` | dev server; scan the QR with Expo Go on the phone (no SDK needed) |
| `npm run build-glyphmap` | regenerate the Remixicon glyph map |
| `npm run bake-assets` | bake the metal / glow PNGs (pure Node + `pngjs`) |
| `npm run serve-design` | static server for the design HTML, port 4173 |

The gate after every task is `npm test && npm run typecheck`, re-run by the
controller rather than trusted from the implementer's report.

## Standing rules from the user

- **Subagent-driven, one fresh implementer per task, no reviewer dispatches** —
  "no need to review, you're making the design I already created."
- **No Playwright / Chromium download.** Reference screenshots came from the
  Playwright MCP attached to an earlier session; image assets are baked in pure
  Node with `pngjs`; this session's web pre-pass drove the installed Chrome
  over CDP.
- **Approved downloads so far:** Expo Go; the Android SDK components and JDK
  needed for the emulator (asked for on 2026-09-07). Anything else: ask.
- **Git is allowed** and pushes are wanted — the user reads the repo from
  another machine.

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

`tile-4.jpg` and `tile-5.jpg` never showed the plate and are untouched, and none
of the screenshots in `docs/reference/` contain photography. **The unredacted
originals were never committed** — they existed only in the previous machine's
session scratchpad, so they are not recoverable from git history. This is a
deliberate, documented departure from the pixel-fidelity mandate; the redacted
area is incidental background, so no designed element is affected.

## Where the authority lives

1. `docs/superpowers/specs/2026-09-05-slice1-foundation-garage-design.md` — the
   approved spec. Binding when the plan disagrees with it.
2. `docs/superpowers/plans/2026-09-05-slice1-foundation-garage.md` — the 23-task
   plan, with complete code in every task. Dispatch tasks from their extracted
   `task-N-brief.md`, never by pasting the plan.
3. `design_handoff_recall_hub/design/GaragePrototype.dc.html` — the real source
   of truth for **every measurement**. Everything is inline-styled, so the way to
   find an element is to search the file for its copy string and read the styles
   off it.
4. `design_handoff_recall_hub/README.md` — a good spec, but prose written about
   the code. **The code wins**; it understates at least the liquid-metal button
   and never mentions the vehicle-stats screen.
5. `CLAUDE.md` — for where that README is wrong.
6. `docs/reference/verification.md` — what the emulator actually showed, and
   the two open decisions.
