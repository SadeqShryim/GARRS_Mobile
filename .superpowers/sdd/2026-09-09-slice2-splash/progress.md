# SDD ledger — plan: docs/superpowers/plans/2026-09-09-slice2-splash.md

Spec: docs/superpowers/specs/2026-09-09-slice2-splash-design.md (binding authority). Source: design_handoff_recall_hub/design/Splash.dc.html. References: docs/reference/splash-*.png + splash-geometry.json (scripts/splash-refs.mjs).

## Session rulings (carried from Slice 1 unless noted)
- Subagent-driven, one fresh implementer per task, **no reviewer dispatches** ("no need to review, you're making the design I already created"). Verification = tests, typecheck, emulator captures vs. references.
- **Git is allowed**; implementers never run git (tasks run in parallel). The controller commits after verifying each task, with the checkpoint message, and pushes at session end (user reads the repo from a laptop).
- No Playwright / Chromium download. References were captured with the installed Chrome over CDP (`scripts/splash-refs.mjs`, no downloads). Asset baking is pure Node + pngjs.
- Downloads this session: `npx expo install @shopify/react-native-skia @expo-google-fonts/instrument-serif` (npm packages, 2026-09-09) — treated as implied by "start slice 2 with the real splash screen" since the CLAUDE.md analysis (which the user approved) says the marquee needs Skia. Recorded here so the user can object.
- Questions are parked, not asked (standing instruction): see spec §15.
- Ruling (2026-09-09): **scope = the whole Splash artboard including the auth steps** — one component, one `onDone`, and `onDone` is only reachable from auth. Why: porting the marquee alone would leave no way out of the splash. Cost if wrong: the auth UI is ~2 tasks of plain RN and can be hidden behind a flag.
- Ruling (2026-09-09): **the marquee scrolls on every run**, although the source runtime's first run never scrolls (row refs unattached until a re-render; REPLAY scrolls). Why: the coded intent (`tick`), the README, and the CLAUDE.md analysis all describe an accelerating marquee. Cost if wrong: one constant (speed × 0 on run 1). Parked in spec §15.
- Ruling (2026-09-09): auth glass pills/fields and REPLAY get **no backdrop blur** (spec §9): invisible over an already-blurred backdrop, and `expo-blur` cannot sample the Skia canvas. The bubble's backdrop blur+saturate IS reproduced (Skia BackdropFilter).
- Model plan: sonnet for Tasks 1, 5, 6, 7, 8, 9, 10; haiku for Tasks 2, 3, 4 (transcription with tests); the controller runs Task 11 (emulator) itself; Task 12 waits for the phone.
- Parallel rulings (disjoint files, as in Slice 1): wave 1 = Tasks 1, 2, 3, 4; wave 2 = Tasks 5, 7 (both need 1 + 3; 7 also needs 2's PNGs); then 8 (needs 7); wave 3 = Tasks 6 (needs 4, 5) and 9 (needs 8); then 10; then 11.

## Pre-flight scan (plan vs. itself and Global Constraints)

| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1 → T5–T10 | `Serif`, `color.tileA/tileB/tilePhoto/markInk/authBlueInk/authError/warning`, `font.serif400`, `ease.css/inOut/bubble`; Skia mock (`skia-<Name>` testIDs, `Skia.Path.Make`, `Skia.RRectXY`, `TileMode`) | every name used later is defined in T1 — OK |
| T2 → T7 | `blob-1..4.png` at `(w+360)×(h+360)`; T7 draws at `(left−180, top−180)` | bleed constant 180 in both — OK; T7's test `require`s the PNGs, so T7 waits for T2 |
| T3 → T5/T6/T7/T10 (`COPY`), T7/T8 (`DUR`, `T`), T9 (`MQ`, `rowTiles`, `rowOffset`, `wrapWidth/Height`, `coverRect`, `colorMatrix`, `TILES`, `HERO`) | `Tile.photo` is an index into `TILES`; T9 indexes `images[tile.photo]` | consistent — OK |
| T4 → T6 | `initialAuth`, `reduce`, `next().done`, `emailArrow/pwArrow/cfArrow` | T6 uses exactly these — OK |
| T5 → T6, T10 | `GlassPill{label,icon,onPress}`, `GlassField{…arrowLabel}`, `GoogleMark`, `ReplayPill{onPress}` | props match at every use — OK |
| T7 → T8, T9, T10 | `BubbleValues{frame,pop,ty,scale,opacity}`, `useBubbleValues`, `startPop`, `fadeOutBubble`, testIDs `bubble`, `bubble-face` | T8 calls `fadeOutBubble`; T9 reads all five; T10 mounts `<Bubble key={runId} v>` — OK |
| T8 → T9, T10 | `MarqueeValues{t,dist,sigma,scale}`, `TimelineValues{stageOp…authOp}`, `useSplashTimeline(bubble) → {phase,runId,run,v}`; manual mock in `__mocks__` | T9 `StageProps` uses both types; T10 and the OverlayHost test `jest.mock('…/useMarqueeDrive')` resolve the adjacent `__mocks__` — OK |
| T9 → T10 | `Stage{width,height,marquee,tl,bubble,bubbleMounted}`, Canvas `testID="stage"`, `skia-BackdropFilter` when mounted | T10's test asserts both — OK |
| T6 → T10 | `AuthPanel{opacity,active,runId,onDone}`, `testID="auth"` + `pointerEvents` | T10's test asserts `pointerEvents` none/auto — OK |
| Global: no RN `<Modal>` | none used — OK |
| Global: every animated Skia prop is a shared value | T9 uses `useDerivedValue` for transform/layer/blur/matrix/clip/origin/filter — OK |
| Skia layer order | T9 nests `Group layer` inside `Group transform` (spec §4) — OK |
| Fonts | T1 adds `InstrumentSerif_400Regular` to the root `useFonts`; T9 loads remixicon.ttf into Skia via `useFont` — OK |

Scan result: no conflicts requiring a ruling beyond the rulings above.

## Progress
- 2026-09-09: research complete (Skia probe on the emulator PASSED inside Expo Go: image tiles, TTF glyph, shared-value blur layer under rotation, composed blur+saturate BackdropFilter); references captured (15 PNGs + geometry JSON); spec and plan written; briefs 1–12 extracted.

### RESUME HERE
CURRENT STATE: spec + plan + briefs written; nothing dispatched yet. Wave 1 (Tasks 1–4) is next, in parallel. After each report: controller re-runs `npm test && npm run typecheck`, records `Task N: complete` here, commits with the checkpoint message. Then wave 2 (5 ∥ 7), 8, wave 3 (6 ∥ 9), 10, then the controller's emulator pass (11) with the emulator recipe in CLAUDE.md, then docs + push.
- Commit 31a365e: spec, plan, briefs, references, splash JPEGs, package.json (skia + instrument-serif).
- Wave 1 dispatched in parallel: Task 1 (sonnet), Task 2 (haiku), Task 3 (haiku), Task 4 (haiku). A `task-N-report.md` means finished; no report = cut off → check the brief's file list on disk and re-dispatch only what is missing.
- Tasks 1, 2, 3, 4: complete (controller-verified on the merged tree: `npm test` 28 suites / 145 tests, `npm run typecheck` clean; no deviations in any report). Committed one per task with the checkpoint messages.
- Wave 2 dispatched in parallel: Task 5 (sonnet, glass primitives — src/screens/splash/{GlassPill,GlassField,GoogleMark,ReplayPill}.tsx + glass.test.tsx) and Task 7 (sonnet, RN layers — src/screens/splash/{Mark,Blobs,Bubble}.tsx + layers.test.tsx). Disjoint files.
- Tasks 5, 7: complete (controller-verified: 30 suites / 154 tests, typecheck clean). Task 5 deviation accepted: the GoogleMark test asserts `String(processColor('#4285F4'))` because react-native-svg 15 runs `fill` through processColor before the host tree — test-only, component verbatim. Committed.
- Wave 3 dispatched in parallel: Task 6 (sonnet, AuthPanel — needs 4 + 5) and Task 8 (sonnet, hooks + manual mock — needs 3 + 7). Disjoint files. Task 9 follows 8; Task 10 follows 6 + 9.
- Task 8: complete (controller-verified: useSplashTimeline 3/3; typecheck clean). Deviation accepted: the test's `phaseOf` helper is typed against `ReactTestInstance` (strict TS rejects the brief's invented prop shape) — test-only. Committed.
- Task 9 dispatched (sonnet, Skia stage — src/screens/splash/{Marquee,Stage}.tsx + stage.test.tsx) in parallel with the still-running Task 6 (AuthPanel). Disjoint files.
- Task 9: complete (controller-verified: stage 3/3, typecheck clean; no deviations, no casts needed). Committed. Task 6 still in flight.
- Task 6: complete (controller-verified: 33 suites / 167 tests, typecheck clean). Deviation accepted: the hardware-back test wraps the direct handler call in `act()` (React 19 defers a bare useReducer dispatch) — test-only, component verbatim; the implementer's temporary debug test file was removed before reporting. Committed.
- Task 10 dispatched (sonnet): Splash.tsx composition, OverlayHost swap, SplashStub + its test deleted.
- Task 10: complete (controller-verified: 33 suites / 168 tests, typecheck clean; no deviations). SplashStub + its test deleted. Committed. ALL CODE TASKS (1–10) COMPLETE.
- Task 11 (emulator pass) started by the controller.
- Task 11: complete (controller-executed 2026-09-10). 16 emu-splash-*.png captured; verification.md Slice 2 section written. Two fixes committed (354f657): PathBuilder for the bubble outline (Skia 2.6 deprecation banner), and the bubble copy at 411 dp — the source's left-aligned `text-wrap: pretty` wrap emulated with a no-break space (the port's `center` was not in the source and was removed). Gate after the fixes: 33 suites / 168 tests, typecheck clean. Frame times on the emulator (lower bound only): 216 frames / 4.2 s, 16.7 % janky.
- Docs updated: WHERE-WE-LEFT-OFF.md rewritten; CLAUDE.md "Active work" + repo status + the Skia analysis note; spec §15.2 resolved; scripts/emu-splash-shots.mjs committed.

### RESUME HERE (supersedes the block above)
CURRENT STATE: Slice 2 is code complete **and emulator-verified**. Tasks 1–11 complete. Only **Task 12** (on-device pass on the S24 Ultra, appended to `docs/reference/verification.md`) remains — run it with Slice 1's Task 23. Gate: 33 suites / 168 tests, typecheck clean. Everything committed and pushed to origin/main on 2026-09-10.
NEXT: Task 12 when the phone is at hand (Expo Go over Wi-Fi: `npx expo start`, scan the QR). Check by eye at 120 Hz: marquee smoothness through the blur ramp, the cut, the pop, blob drift, step entrance; the bubble's line count; keyboard behaviour on the email field; back on the password step. Then Slice 3 (no spec or plan yet — brainstorm → spec → plan → briefs; candidates: the four stub tabs, concierge chat, recall detail).
