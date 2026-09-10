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
