# Task 12 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-12-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 12: On-device pass on the S24 Ultra (with Slice 1's Task 23)

**Files:**
- Modify: `docs/reference/verification.md` (append the on-device section)

- [ ] **Step 1:** Expo Go on the phone (Play Store), `npx expo start`, scan the QR (or USB: `adb devices`, then the Task 11 recipe).
- [ ] **Step 2:** Watch a cold launch and three REPLAYs at 120 Hz: marquee smoothness through the blur ramp, the cut, the bubble pop, blob drift, step entrances. Check the bubble copy's line count by eye; the keyboard behaviour on the email field (layout compresses, footer above the keyboard); Android back on the password step.
- [ ] **Step 3:** Append to `verification.md`:

```markdown
## On-device — Samsung S24 Ultra (Slice 2)
Date: <date>   Expo Go version: <version>   Display mode: <FHD+ / QHD+>
- Marquee at 120 Hz: smooth / janky (where)
- Bubble copy: one line / two lines
- Keyboard: auth column compresses, footer visible — yes / no
- Back button on password step returns to email — yes / no
- Anything that differs from the emulator: <list or none>
User sign-off: <name / date>
```

- [ ] **Step 4: Checkpoint** — "docs: slice 2 on-device verification"

