# Where we left off

**Last updated: 2026-09-06** — the session that first pushed this repo to GitHub.

Read this, then `.superpowers/sdd/2026-09-05-slice1-foundation-garage/progress.md`
(the execution ledger). If the two disagree, the ledger is newer and wins.

---

## One-paragraph summary

**Recall Hub** is a vehicle safety-recall app. It exists as a finished, approved
prototype authored in Claude Design (`design_handoff_recall_hub/`), and is being
ported to **Expo / React Native**. We are executing **Slice 1 — Foundation +
Garage tab** from a written 23-task plan. **Every code task is done.** The only
work left is hardware verification: boot the emulator, compare against the
reference screenshots, then repeat on the physical phone.

## Status at a glance

| | |
|---|---|
| Slice 1 code tasks (1, 3–21 + overlay mount) | ✅ complete, each controller-verified |
| Test suite | 22 suites / 113 tests passing |
| `tsc --noEmit` | clean |
| Task 2 (emulator smoke test) | ⏳ ready to run — **newly unblocked**, see below |
| Task 22 (emulator fidelity pass) | ⏳ blocked on Task 2 |
| Task 23 (on-device pass, S24 Ultra) | ⏳ blocked on Task 22 |

## The one thing that changed since the last session

Task 2 was blocked for two sessions because this PC is **ARM64 Windows
(Snapdragon X)** and the only Android system image on disk was x86_64, which
exits instantly. **That blocker is gone.** An AVD now exists and is arm64:

```
AvdId          = s24ultraProxy      <-- NOTE THE NAME
abi.type       = arm64-v8a
hw.device.name = pixel_8
image.sysdir.1 = system-images\android-35\google_apis_playstore_ps16k\arm64-v8a\
```

⚠️ **The name is `s24ultraProxy`, not `s24proxy`.** `CLAUDE.md`, the plan, and
`task-2-brief.md` were all written against `s24proxy`, which no longer exists.
Substitute the new name wherever a brief says `s24proxy`. The system image is
the `_ps16k` (16 KB page size) playstore variant — expected on arm64 API 35,
not a problem.

## Resume here — the exact next three steps

1. **Task 2, Steps 3–6.** Boot `s24ultraProxy`, run `npm run android` (this
   installs Expo Go on the emulator — already approved by the user), take the
   smoke screenshot to `docs/reference/emu-smoke.png`. Dispatch from
   `.superpowers/sdd/2026-09-05-slice1-foundation-garage/task-2-brief.md`,
   correcting the AVD name.
2. **Task 22.** Emulator fidelity pass against `docs/reference/*.png`; settle the
   final blur values in `src/theme/tokens.ts`; write `docs/reference/verification.md`.
   This task also absorbs the emulator checks deferred from Tasks 10, 11, 15, 16,
   and 17, plus a re-check of typed-route hrefs once `expo start` has generated
   `.expo/types` (never generated in any session so far).
3. **Task 23.** On-device pass on the **Samsung S24 Ultra** (the demo device),
   appended to `verification.md`. Needs the phone on Wi-Fi or USB with USB
   debugging on.

## Environment facts that keep biting

- **This PC is ARM64 Windows.** Only `arm64-v8a` system images run. Git Bash
  reports `x86_64` because it runs emulated — don't trust it; `systeminfo` says
  `ARM64-based PC`.
- `ANDROID_HOME` and PATH are set as **user** env vars, so they only exist in
  **new** shells. In an already-open shell, call the tools by absolute path:
  - `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"`
  - `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe"`
- There are **no `cmdline-tools`** in the SDK, so AVDs cannot be created or
  edited from the command line — that has to happen in Android Studio.

## Commands

| | |
|---|---|
| `npm test` | jest-expo; single file with `npm test -- <pattern>` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run android` | Expo Go on the booted emulator |
| `npm run build-glyphmap` | regenerate the Remixicon glyph map |
| `npm run bake-assets` | bake the metal / glow PNGs (pure Node + `pngjs`) |
| `npm run serve-design` | static server for the design HTML, port 4173 |

The gate after every task is `npm test && npm run typecheck`, re-run by the
controller rather than trusted from the implementer's report.

## Standing rules from the user

- **Subagent-driven, one fresh implementer per task, no reviewer dispatches** —
  "no need to review, you're making the design I already created."
- **No Playwright / Chromium download.** Reference screenshots came from the
  Playwright MCP attached to the session; image assets are baked in pure Node
  with `pngjs`.
- **Approved downloads:** Expo Go onto the emulator, and the arm64 system image
  (done). Nothing else without asking.
- **Git: the hold is lifted** as of 2026-09-06 — this repo is now on GitHub at
  <https://github.com/SadeqShryim/GARRS_Mobile>. Earlier notes saying "no git,
  no repository exists" are historical.

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
of the 11 screenshots in `docs/reference/` contain photography. **The unredacted
originals were never committed** — they exist only in this machine's session
scratchpad, so they are not recoverable from git history. This is a deliberate,
documented departure from the pixel-fidelity mandate; the redacted area is
incidental background, so no designed element is affected.

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
