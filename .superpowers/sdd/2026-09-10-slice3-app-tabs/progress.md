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

| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1 → T2, T3 | `RECALLS_COPY.bookedToast`, `LIVE_RECALL`, `STATE_META`, `EMPTY_REASON`, `SVC_*`, `TRACKER`, `PLANS`, `CHAT_SCRIPT`, `CANNED_REPLY`; Slice 3 types | every name T2/T3 import is defined in T1 — OK |
| T1 → all screens | tokens `color.infoBg/dangerBg/dangerEdge/dangerInk/hair08/hair10/hair12/hair14/hair20/ink7/ink8/doneRing/chat*/map*`, `dur.strip/color/hubAuto/swipe/snap/leave/toggle/tilt/bubbleIn/dotBob/screen/shine`, `ease.css/swipe/sheet/press`; global mocks for expo-router (`router` export), expo-sensors, gesture-handler | defined in T1 (hair07/hair08/hair14/shellDark/textOnDark pre-exist from Slice 1) — OK |
| T2 → T6/T7/T8/T9/T10/T11 | `lib/recalls` (allRecalls, vehicleName, recallCounts, heroVals, FILTERS, filterVals, emptyText, itemRows, detailFor), `lib/service` (openRecallVehicle, reasonVals, reasonRows, doneDetails, trackerSteps, tiltFor, tiltChanged, RAD_TO_DEG), `lib/hub` (GROUPS, groupChip, HUB_COPY, hubHeadline, hubCounter, visibleLights, lightById, BADGE, articleById, articleIndex, neighbour, nextTitle), `lib/chat` (revealPlan, SEND_REPLY_DELAY), `lib/membership` (planLabel, planLine, planToast, featureVals) | each consumer imports exactly these — OK |
| T3 → screens | `openScreen/closeScreen`, `setRecallFilter/toggleRecall/showRecall/scheduleFromRecalls`, `setPlan`, `setHubIdx/setHubGroup/openLight/closeLight/openArticle/setArticle/closeArticle`, `setSvcMethod/Date/Time/confirmService/returnToGarage`, `togglePref`; `sheet: 'reason'`, `screen: 'membership' | 'chat' | 'article'` | consumers use exactly these — OK |
| T4 → screens | `StatusChip{bg,fg,icon?,label,ls?,padX?,padY?}`, `Toggle{on,label,onPress}`, `ShineBorder{ramp,radius,style,testID}` (+ `shine` testID), `SheetShell{onClose,handleMargin,paddingBottom,gap,testID}`, `InfiniteRail` + `InfiniteRailHandle{scrollTo,advance}` | LightSheet passes ls/padX/padY; HubScreen uses the ref handle — OK |
| T5 → T7 | `TiltMap` (no props) | OK |
| T6 ↔ T7/T8/T10 routes | T6 owns `app/(tabs)/recalls/*`, `garage/[id].tsx`, `HumpTabBar`; T7 `service.tsx`; T8 `hub.tsx`; T10 `profile.tsx` + `SlideUpScreen` | disjoint — OK |
| T8 ↔ T9 (same directory) | T8: HubScreen, ArticleCard, LightSheet, hub.test; T9: ArticlePanel, ArticleReader, ArticleReader.test | disjoint — OK |
| T10 ↔ T11 (same directory) | T10: ProfileScreen, MembershipScreen, PlanCard, profile.test; T11: ChatScreen, ChatScreen.test | disjoint — OK |
| T7/T8/T9/T10/T11 → T12 | `ReasonSheet`, `LightSheet`, `ArticleReader`, `MembershipScreen`, `ChatScreen` (no props); testIDs `sheet-reason`, `sheet-light`, `article-reader`, `screen-membership`, `screen-chat` | T12's OverlayHost + test use exactly these — OK |
| Global: no RN `<Modal>` | none — OK |
| Global: MetalButton props | `tint="default"`, `width="auto"`, `flex`, `testID` all exist (Slice 1) — OK |

Scan result: no conflicts requiring a ruling beyond the rulings above.

## Progress
- 2026-09-10: research complete (whole design read; 41 reference captures + geometry); spec written and committed (235b195); expo-sensors installed.

### RESUME HERE
CURRENT STATE: spec committed; briefs being written (`task-N-brief.md` in this directory; the plan file is assembled from them). Nothing dispatched yet.
NEXT: finish the briefs, run the pre-flight scan, dispatch wave 1 (Task 1), then waves 2–4 as above. After each report: controller re-runs `npm test && npm run typecheck`, records `Task N: complete` here, commits with the checkpoint message. Then Task 12, the controller's emulator pass (13) with the emulator recipe in CLAUDE.md, docs, push.
- Task 1: complete (controller-verified: 34 suites / 177 tests, typecheck clean). Deviation accepted: double-quoted string literals for the two lines containing the curly apostrophe — content verbatim. Committed.
- Wave 2 dispatched in parallel: Task 2 (haiku, lib derivations) and Task 4 (sonnet, primitives + garage Rail refactor). Disjoint files.
- Tasks 2, 4: complete (controller-verified on the merged tree: 36 suites / 196 tests, typecheck clean). Task 2 deviation accepted: toBeCloseTo for the float tilt assertions. Task 4 deviations accepted: no pointerEvents prop on the rotating Animated.Image (matches MetalButton); scroll test event carries layoutMeasurement/contentSize. Committed one per task.
- Wave 3 dispatched in parallel: Task 3 (sonnet, store) and Task 5 (sonnet, useTilt + TiltMap). Disjoint files.
- Tasks 3, 5: complete (controller-verified: 37 suites / 206 tests, typecheck clean; no deviations). Committed one per task.
- Wave 4 dispatched in parallel (all sonnet): Task 6 (Recalls + detail + routes), 7 (Service), 8 (Hub + LightSheet), 9 (ArticleReader), 10 (Profile + Membership), 11 (Chat). Disjoint files; Task 12 (OverlayHost) follows.
