# SDD ledger — plan: docs/superpowers/plans/2026-09-10-slice3-app-tabs.md

Spec: docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md (binding authority). Source: design_handoff_recall_hub/design/GaragePrototype.dc.html. References: docs/reference/app-*.png + app-geometry.json (scripts/app-refs.mjs, 41 captures, 2026-09-10).

## Session rulings (carried from Slices 1–2 unless noted)
- Subagent-driven, one fresh implementer per task, **no reviewer dispatches** ("no need to review, you're making the design I already created"). Verification = tests, typecheck, emulator captures vs. references.
- **Git is allowed**; implementers never run git (tasks run in parallel). The controller commits after verifying each task, with the checkpoint message, and pushes at session end (user reads the repo from a laptop).
- No Playwright / Chromium download. References captured with the installed Chrome over CDP (`scripts/app-refs.mjs`). Asset baking is pure Node + pngjs.
- Downloads this session: `npx expo install expo-sensors` (2026-09-10) — the design's tilt map reads device orientation and the README's Expo table names `expo-sensors` for it; treated as implied by "get the rest of the app functional for the demo". Recorded here so the user can object (the map degrades to a flat card if the package is removed).
- Questions are parked, not asked (standing instruction): spec §15 (7 decisions).
- Ruling (2026-09-10): the recall detail is a **stack route inside the recalls tab** (like stats in garage) — swaps in place under the tab bar, Android back pops it.
- Ruling (2026-09-10): chat state is local to `ChatScreen`; the reason sheet is `sheet: 'reason'`; the light sheet is driven by `hubLight` (spec §5, §15).
- Ruling (2026-09-10): the garage rail's snapping/wrapping logic is generalised into `ui/InfiniteRail` and reused by the hub (identical geometry: 318 + 14, 9 %/91 % mask); the garage `Rail` becomes a thin wrapper. Covered by the existing Garage tests + one emulator capture.
- Model plan: haiku for Task 1 (transcription) and Task 2 (pure functions with tests); sonnet for Tasks 3–12; the controller runs Task 13 (emulator) itself; Task 14 waits for the phone.
- Parallel rulings (disjoint files): wave 1 = Task 1; wave 2 = Tasks 2, 4 (both need 1 only); wave 3 = Tasks 3 (needs 2), 5 (needs 1, 2); wave 4 = Tasks 6, 7, 8, 9, 10, 11 (all need 3 + 4; 7 needs 5); then 12 (needs 7–11); then 13.
- A user file `Recording 2026-09-10 011300.mp4` appeared untracked at the repo root during this session — not committed, not touched (commits use explicit paths).

## Pre-flight scan (plan vs. itself and Global Constraints)
(filled in after the briefs are written)

## Progress
- 2026-09-10: research complete (whole design read; 41 reference captures + geometry); spec written and committed (235b195); expo-sensors installed.

### RESUME HERE
CURRENT STATE: spec committed; briefs being written (`task-N-brief.md` in this directory; the plan file is assembled from them). Nothing dispatched yet.
NEXT: finish the briefs, run the pre-flight scan, dispatch wave 1 (Task 1), then waves 2–4 as above. After each report: controller re-runs `npm test && npm run typecheck`, records `Task N: complete` here, commits with the checkpoint message. Then Task 12, the controller's emulator pass (13) with the emulator recipe in CLAUDE.md, docs, push.
