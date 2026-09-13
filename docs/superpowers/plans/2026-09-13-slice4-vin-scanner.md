# Slice 4 — VIN scanner — implementation plan

Spec: `docs/superpowers/specs/2026-09-13-slice4-vin-scanner-design.md` (binding). Ledger: `.superpowers/sdd/2026-09-13-slice4-vin-scanner/progress.md`. Same execution mode as Slices 1–3: one fresh implementer per task, no reviewer dispatches, gate `npm test && npm run typecheck` re-run by the controller, implementers never run git. Unlike the design-port slices this plan carries **contracts, not finished code** — there is no artboard to transcribe; the spec's interfaces (§5–§11) are the contract and the tests are the proof.

Task ownership is disjoint so Tasks 2–6 run in parallel. Task 7 integrates. Task 8 verifies on the emulator and closes the docs.

| # | Task | Owner | Files (owned) | Depends on |
|---|---|---|---|---|
| 1 | Dependencies, config, jest mocks, glyph list | controller | `package.json`, `app.json`, `jest.setup.ts`, `src/assets/__tests__/assets.test.ts`, `src/lib/__tests__/fixtures/**` | — |
| 2 | VIN library + confidence score | implementer | `src/lib/vin.ts`, `src/lib/__tests__/vin.test.ts` | 1 |
| 3 | NHTSA client + vehicle/recall mapping | implementer | `src/lib/nhtsa.ts`, `src/lib/__tests__/nhtsa.test.ts`, `src/fixtures/types.ts` (Recall optional fields), `src/lib/recalls.ts` (+ its existing test if touched) | 1 |
| 4 | OCR engine (WebView page + hook) | implementer | `src/ocr/ocrPage.ts`, `src/ocr/OcrEngine.tsx`, `src/ocr/__tests__/OcrEngine.test.tsx` | 1 |
| 5 | Capture pipeline (crop maths + manipulator) | implementer | `src/ocr/crop.ts`, `src/ocr/capture.ts`, `src/ocr/__tests__/crop.test.ts`, `src/ocr/__tests__/capture.test.ts` | 1 |
| 6 | Store: scan state, `addScannedVehicle`, `ScreenId 'scan'` | implementer | `src/store/useAppStore.ts`, `src/store/__tests__/useAppStore.test.ts` | 1 |
| 7 | Scanner screen + entry points + OverlayHost | implementer | `src/screens/scan/*`, `src/screens/scan/__tests__/*`, `src/overlays/OverlayHost.tsx` (+test), `src/screens/AddVehicleSheet.tsx` (+test), `src/screens/VinHelpScreen.tsx` (+test) | 2–6 |
| 8 | Emulator verification, docs, push | controller | `docs/reference/verification.md`, `docs/reference/emu-scan-*.png`, `CLAUDE.md`, `WHERE-WE-LEFT-OFF.md`, ledger | 7 |
| 9 | Phone pass (with Slices 1–3's) | controller, later | `verification.md` | 8, the phone |

## Task 1 — dependencies, config, mocks (controller, done 2026-09-13)

`npx expo install expo-camera expo-image-manipulator react-native-webview` (pinned `~57.0.5`, `~57.0.17`, `13.16.1`). `app.json`: `expo-camera` plugin with the permission string, `android.permissions: ["CAMERA"]`, `ios.infoPlist.NSCameraUsageDescription`. `jest.setup.ts`: mocks for the three modules exposing `__cameraMock`, `__manipulatorMock`, `__webviewMock` (see the file — tests import them via `jest.requireMock('expo-camera')` etc.). `assets.test.ts`: the six new glyphs. Fixtures copied into `src/lib/__tests__/fixtures/`: `ocr-lab.json` (16 plates: `plate`, `vin`, `text`, `symbols[{t,c}]`) and `nhtsa/decode-*.json`, `nhtsa/recalls-*.json` (recorded 2026-09-13, trimmed).

## Task 2 — `src/lib/vin.ts` (spec §5, §6)

Export exactly the API in §5 plus `computeScore(verdict: LocalVerdict, nhtsa: 'clean' | 'fatal' | 'none'): { score: number; passes: boolean }` where `nhtsa: 'none'` means no lookup was made (used for `check-ok` and demo VINs → structure 100; for `check-fail`/`malformed` → structure 0) and `'clean'`/`'fatal'` apply to `unchecked`. Import `DECODE` from `../fixtures/decode` for the demo-VIN rule (§5.2, §16.4).

Tests (`vin.test.ts`), all pure:
- `checkDigit`: `1HGCM82633A004352` → `'3'`, `JH4KA7561PC008269` → `'1'`, `5YJ3E1EA7KF317654` → `'5'` (so the VIN is invalid), a VIN whose sum mod 11 is 10 → `'X'`.
- `normalizeRead('1hg cm8-2633a 0o4352')` → `'1HGCM82633A004352'` (`O`→`0`), `I`→`1`, `Q`→`0`.
- `positionalOk`: position 10 rejects `0`/`U`/`Z`; positions 15–17 must be digits; NA VINs need digits at 12–17.
- Every row of `fixtures/ocr-lab.json` where `vin` is `1HGCM82633A004352` or `JH4KA7561PC008269`: `readVin` returns that VIN with `structure: 'check-ok'` and `computeScore(v, 'none').passes === true`; for the two `T…` rows the candidate carries `subs: 1` and the score is in [93, 97]. Rows for the invalid sample VINs (`5YJ…`, `WBA…`): the `5YJ` rows yield `check-fail` (NA, no candidate validates) and `computeScore(...).passes === false`; the `WBA` rows yield `unchecked`, then `computeScore(v, 'clean').passes === true` and `computeScore(v, 'fatal').passes === false`.
- Synthetic: an 18-character read `1THGCM82633A004352` (symbols all 98) → `deletions: 1`, score 93, passes. A 16-character read → `malformed`. Two substitutions + one deletion → score < 90. The rounding rule from §6 (89.8 → 90 passes; 89.4 → 89 fails).
- `DECODE` key `1FTVW1EL5NWG00001` read cleanly → `check-ok` despite its invalid check digit.
- `formatVin('1HGCM82633A004352')` → `'1HGC M826 33A0 0435 2'`.

## Task 3 — `src/lib/nhtsa.ts` (spec §9, §10)

Export the API in §9 with `fetchImpl` injectable (default `globalThis.fetch`) and an `AbortController` timeout of 12 s (`setTimeout` → `abort()`; clear on settle). `decodeVin` builds the URL with `encodeURIComponent(vin)` and `?format=json`; `recallsFor` uses `URLSearchParams` for `make`, `model`, `modelYear`. Non-2xx → throw `NhtsaError('http', status)`; abort → `NhtsaError('timeout')`; network → `NhtsaError('network')`. `nhtsaOutcome` per §9.1 (parse `ErrorCode` by splitting on `,` and trimming). Recall mapping per §9.2: `campaign` → `code` (`19V182000` → `NHTSA 19V-182`; rule: first 3 chars + `-` + next 3), title-case component with ` · ` separators, `date` from `DD/MM/YYYY` → `YYYY-MM-DD`, sort newest first, `parkIt: !!r.parkIt`.

`vehicleFromDecode(d, recalls, rawVin)` per §10: `name = [d.model, d.trim].filter(Boolean).join(' ')`, `meta = `${d.year} ${titleCase(d.make)} · ${d.body || d.fuel}``, `health 90`, `range '—'`, `vin: maskVin(rawVin)` (from `../lib/derive`), `sync 'SYNCED JUST NOW'`, telemetry constants as in `addVehicle`, `recall = recalls[0] ? { code, title: component, remedy, summary, date } : null`.

`src/fixtures/types.ts`: `Recall` gains `remedy?: string; summary?: string; date?: string`. `src/lib/recalls.ts` `allRecalls`: `remedy: v.recall!.remedy ?? LIVE_RECALL.remedy`, `done: scheduled ? LIVE_RECALL.doneScheduled : v.recall!.date ? 'Reported ' + longDate(v.recall!.date) : LIVE_RECALL.doneOpen` with `longDate('2019-03-06')` → `'6 Mar 2019'` (export it from `nhtsa.ts` or a tiny `src/lib/dates.ts` you own). Existing recall tests must keep passing unchanged (the seed vehicles have no `date`).

Tests (`nhtsa.test.ts`) with `fetchImpl` stubs returning the recorded fixtures (`fs.readFileSync` of `__tests__/fixtures/nhtsa/*.json`, or `require`): Honda → clean, fields as recorded, `vehicleFromDecode` → `Accord EX-V6` / `2003 Honda · Coupe` and a recall `NHTSA 19V-182` titled `Air bags · Frontal · Driver side · Inflator module` dated `2019-03-06`; `THGCM…` → fatal (`1,7`, empty Make); the 16-char decode → fatal (`6`); BMW → `nhtsaOutcome(d, false)` clean and `nhtsaOutcome(d, true)` fatal; Tesla 2019 recalls → 3 mapped, sorted newest first, dates parsed from `DD/MM/YYYY`; `recalls-…1975` → `[]`; HTTP 500 → rejects with `kind: 'http'`; a never-resolving fetch + fake timers → rejects with `kind: 'timeout'` at 12 s and `signal.aborted` is true.

## Task 4 — `src/ocr/ocrPage.ts`, `src/ocr/OcrEngine.tsx` (spec §7)

`ocrPage.ts` exports `OCR_PAGE: string` (the HTML) and `VIN_WHITELIST` (import `VIN_CHARS` from `../lib/vin` if Task 2 has landed; otherwise define the same constant locally and note it — the controller will dedupe). The page must not use template-literal backticks inside itself in a way that breaks the TS string (use a plain string with `\n` joins or `String.raw`). Protocol exactly as §7; `window.__ocr.recognize(id, dataUrl)` must guard against calls before `ready` by queueing them (one pending request max; a newer request supersedes the older one, which then resolves as `{ type: 'error', id, message: 'superseded' }`).

`OcrEngine.tsx` exports `useOcrEngine(): { status, progress, error, recognize }` **and** the `OcrEngine` component that must be rendered for the hook to work — implement as a context: `<OcrEngineProvider>` renders the hidden `WebView` and provides `{ status, progress, error, recognize }`; `useOcrEngine()` reads the context. `recognize` returns `Promise<Read>` (`Read` from `../lib/vin` or a local identical type). Request ids are monotonically increasing; a result for an unknown/stale id is ignored; 20 s per-request timeout and 45 s ready timeout (`setTimeout`, cleared on unmount). Props of the provider: none (the CDN URLs and model path are constants in `ocrPage.ts`).

Tests (`OcrEngine.test.tsx`) using `__webviewMock` from `jest.requireMock('react-native-webview')`: renders the WebView; `post({ type: 'progress', status: 'loading language traineddata', progress: 0.5 })` updates `progress`; `post({ type: 'ready' })` flips `status` to `ready`; `recognize('QUJD')` injects a script containing `__ocr.recognize(` and the id and `data:image/jpeg;base64,QUJD`, and resolves when `post({ type: 'result', id, text: 'ABC', symbols: [...] , ms: 12 })` arrives; a stale id is ignored; `post({ type: 'error', id, message })` rejects; fake timers: no `ready` in 45 s → `status: 'error'`; no result in 20 s → rejects `timeout`.

## Task 5 — `src/ocr/crop.ts`, `src/ocr/capture.ts` (spec §8)

`crop.ts` (pure): `export type Rect = { x: number; y: number; w: number; h: number }`; `guideRect(previewW, previewH): Rect` (§8 numbers); `cropRectFor(guide: Rect, preview: { w; h }, photo: { w; h }, pad = 0.06): Rect` in **photo pixels**, integers, clamped to the photo, cover-fit as specified. `capture.ts`: `captureVin(camera: { takePictureAsync: (o: object) => Promise<{ uri: string; width: number; height: number }> }, guide: Rect, preview: { w; h }): Promise<{ base64: string; width: number; height: number }>` using `ImageManipulator.manipulate(uri).crop(rect).resize({ width: 1400 })`, `renderAsync()`, `saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true })`; throws `new Error('no-base64')` if the result lacks `base64`.

Tests: `guideRect(412, 915)` → width 380, height 72 (rounded), centred x 16, centre y at 42 % → y = 384 − 36 = 348 (assert within ±1). `cropRectFor` for a 4000×3000 photo in a 412×915 preview: `s = max(412/4000, 915/3000) = 0.305`, the visible region is 1350.8 px wide → the guide (x 16, w 380) maps to x ≈ (4000 − 1350.8)/2 + 16/0.305 … assert the numbers you derive (show the derivation in a comment) and that the rect is inside the photo, padded, integer; a portrait 3000×4000 photo in the same preview (cover on width). `capture.ts` with `__manipulatorMock`: the crop rect passed equals `cropRectFor(...)`, the resize is `{ width: 1400 }`, the save options are JPEG/0.9/base64, the result is `{ base64: 'QUJD', width: 1400, height: 266 }`; a mock save without `base64` → rejects `no-base64`.

## Task 6 — store (spec §10)

`ScreenId` adds `'scan'`. State `scan: ScanState` with `initial` `{ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null }`; actions `setScan(patch: Partial<ScanState>)`, `resetScan()`, `addScannedVehicle(v: Vehicle)` (appends, `idx` last, `screen: null`, `sheet: null`, `vin: ''`, toast `${v.name} added · ${v.recall ? '1 recall found' : 'monitoring for recalls'}`), and `openScan()` = `set({ screen: 'scan' })` + `resetScan()`. `closeScreen` also resets `scan` when the screen was `'scan'`. Keep every existing action and test unchanged.

Tests (append to `useAppStore.test.ts`): `openScan` sets the screen and idle scan state; `setScan` merges; `addScannedVehicle` with a vehicle carrying a recall → vehicles +1, idx last, sheet and screen null, toast `… added · 1 recall found`; without → `monitoring for recalls`; `closeScreen` from scan resets scan; `switchTab` still clears the screen.

## Task 7 — scanner screen and entry points (spec §11, §12)

Files: `src/screens/scan/ScanScreen.tsx` (default export the screen; wraps its content in `OcrEngineProvider`), `ScanGuide.tsx` (scrim quadrants + corner marks, pure layout given a `Rect`), `ScanResult.tsx` (the card, both variants), `scanFlow.ts` (the async sequence as a plain function `runScan(deps)` so it is testable without React: capture → recognize → readVin → maybe decodeVin/recallsFor → computeScore → either `addScannedVehicle(vehicleFromDecode(...))` + `setScan({ phase: 'added', … })` or `setScan({ phase: 'failed', … })`; demo-VIN branch per §10; errors map to the reasons/labels in §11). `OverlayHost.tsx`: mount `{screen === 'scan' && <ScanScreen />}` after the sheets and before `Toast` (order as the header comment; update the comment). `AddVehicleSheet.tsx`: Scan chip → `openScan()`; `VinHelpScreen.tsx`: Scan → `closeVinHelp(); openSheet('add'); openScan()`. "Type it instead" → `setVin(bestGuess ?? '')` then `closeScreen()`.

Layout and copy exactly as §11 (tokens only; no new colours beyond the rgba scrims listed). Use `useSafeAreaInsets`, `useWindowDimensions` for the guide, `expo-image` `Image` for the crop preview, Reanimated for the scan line and the card slide. Accessibility labels: `Close`, `Torch`, `Capture`, `Allow camera` / `Open settings`, `Done`, `Try again`, `Type it instead`. `testID`s: `screen-scan`, `scan-guide`, `scan-result`, `scan-status`.

Tests (`src/screens/scan/__tests__/ScanScreen.test.tsx`, `scanFlow.test.ts`; update `OverlayHost.test.tsx`, `AddVehicleSheet.test.tsx`, and the VIN-help test if one exists): permission granted → camera view + guide + Capture; permission denied (flip `__cameraMock.state.permission`) → the allow/settings copy; `runScan` with stubbed deps: Honda fixtures → `addScannedVehicle` called with `Accord EX-V6`, phase `added`, score ≥ 90; a `T…` read → substitution, still added; the `5YJ…` read → `failed`, reason `Check digit does not match`, no fetch; engine error → `failed` with `READER UNAVAILABLE`; NHTSA timeout on an unchecked VIN → `NO CONNECTION`; demo VIN → added from `DECODE` with no fetch. Screen-level: pressing Capture with the engine `ready` (post `ready` via `__webviewMock`, then post a `result`) walks idle → reading → added and the card shows `9x% MATCH`; `Try again` returns to idle; `Type it instead` sets `vin` and closes. OverlayHost: `screen: 'scan'` mounts `screen-scan`; back closes it. AddVehicleSheet: the Scan chip sets `screen` to `'scan'`.

## Task 8 — verification and docs (controller)

Spec §15. Also: `docs/reference/verification.md` "Slice 4" section (what was checked, the score seen, the parked decisions), `CLAUDE.md` Active-work rewrite (Slice 4 status, the new downloads, the OCR-in-WebView fact, the emulator poster trick), `WHERE-WE-LEFT-OFF.md` session 9 notes, ledger RESUME HERE, commit per task with explicit paths, push.
