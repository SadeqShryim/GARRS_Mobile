# Task 11 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-11-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 11: Emulator verification pass (controller)

**Files:**
- Create: `docs/reference/emu-splash-*.png`
- Modify: `docs/reference/verification.md` (append a Slice 2 section), any file a genuine mistake lives in

**Interfaces:**
- Consumes: the references (`docs/reference/splash-*.png`, `splash-geometry.json`) and the finished app.
- Produces: the fidelity record the spec's acceptance criteria point at.

- [ ] **Step 1: Run the app** — boot `s24ultraProxy`; `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start < /dev/null` (background); `adb reverse tcp:8081 tcp:8081`; open `exp://127.0.0.1:8081`. If Expo Go shows "Something went wrong", tap reload.

- [ ] **Step 2: Capture** — with `adb exec-out screencap -p`: `emu-splash-marquee-0s` (tap REPLAY, capture immediately), `-1s`, `-2s`, `-2.6s` (from REPLAY + delay; screencap latency ≈ 0.1 s), `emu-splash-photo` (3.2 s), `-bubble` (4.6 s), `-fade` (6.8 s), `-auth-email` (8.3 s), then drive the auth by `adb shell input tap/text`: `-auth-email-filled`, `-auth-password`, `-auth-password-filled`, `-auth-password-eye`, `-auth-confirm`, `-auth-confirm-error`, and `-replay-0.3s`. Timing captures use `adb shell "input tap X Y; sleep T; screencap -p /sdcard/x.png"` so the delay runs on the device.

- [ ] **Step 3: Compare** each pair with the reference at matched physical scale, in this order: geometry (positions/sizes from `splash-geometry.json`) → type → colours → state content → motion by eye on the emulator (marquee acceleration and blur ramp, cut, bubble pop, blob drift, step entrance, REPLAY cross-fade). Check the parked items: does the bubble copy wrap at 411 dp; is the marquee gap visible under the vignette; does the `filter` blur on StepIn / the bubble highlight take effect.

- [ ] **Step 4: Frame-time sanity** — `adb shell dumpsys gfxinfo host.exp.exponent reset`, tap REPLAY, wait 4 s, `adb shell dumpsys gfxinfo host.exp.exponent` → note "Janky frames" for the marquee window. The emulator (software GL) is a lower bound only.

- [ ] **Step 5: Fix mistakes, record limits** — anything that is a transcription/logic mistake is fixed in code (with its test); anything that is a platform limit goes into the flags list.

- [ ] **Step 6: Append to `docs/reference/verification.md`**

```markdown
# Slice 2 verification — Splash on Android emulator (s24ultraProxy, Pixel 8 / API 35)

Date: <date>
Reference: docs/reference/splash-<state>.png (design, 430×932 @2x)   Emulator: docs/reference/emu-splash-<state>.png (411 dp @2.625x)

| State | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Marquee 0 s / 1 s / 2 s / 2.6 s | splash-marquee-*.png | emu-splash-marquee-*.png | | tile positions are time-dependent; compare look |
| Photo cut | splash-photo.png | emu-splash-photo.png | | |
| Bubble | splash-bubble.png | emu-splash-bubble.png | | |
| Fade | splash-fade.png | emu-splash-fade.png | | |
| Auth — email / filled / password / filled / eye / confirm / error | splash-auth-*.png | emu-splash-auth-*.png | | |
| REPLAY cross-fade | splash-replay-0.3s.png | emu-splash-replay-0.3s.png | | |

## Known, accepted differences (spec §9)
- <copy the §9 flags that apply, one line each>

## Differences found and fixed during this pass
- <one line each, or "none">

## Differences found and NOT fixed (need a decision)
- <the §15 parked items with what the emulator showed>

## Frame times
- Marquee window janky frames: <n>% of <m> (emulator, software GL — lower bound)
```

- [ ] **Step 7: Run the full suite** — `npm test && npm run typecheck` → PASS.

- [ ] **Step 8: Checkpoint** — "docs: slice 2 emulator verification record"

