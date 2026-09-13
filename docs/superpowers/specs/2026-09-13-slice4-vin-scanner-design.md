# Slice 4 — VIN scanner (camera OCR with a confidence gate) — design spec

**Date:** 2026-09-13 · **Status:** approved by construction — the user asked: *"work on the ocr scanner functionality for the mobile app. Since we want the users to be able to interact in a way to scan their Vin number and then I want it to build a confidence system. If it's above 90% then you add the vehicle and pull data on it, if not error showing the user to do it again."* Open questions are parked in §16 rather than asked (standing instruction).

This is the first slice **outside the design handoff**: `GaragePrototype.dc.html` has no scanner. The new screen is designed here in the app's own idiom (tokens, `Sans`/`Mono`, `MetalButton`, `SlideUpScreen`/sheet chrome) and is verified against this spec, not against a design capture. Everything that already exists keeps its pixel fidelity.

## 1. Goal

From the Add-vehicle sheet (and the VIN-help footer), the user opens a full-screen camera, lines the VIN up in a guide, taps **Capture**. The photo is cropped to the guide, read by on-device OCR, and turned into a **confidence score 0–100**. At **≥ 90** the app decodes the VIN against NHTSA (make, model, year, trim, body), looks up open recalls for that vehicle, adds the vehicle to the garage with that data, and lands the user on it with a toast. Below 90 the screen shows the score and an error telling the user to try again, with a **Try again** button that returns to the live camera.

## 2. Constraints and decisions that shape the design

- **Expo Go stays the runtime** (Android emulator, the S24 Ultra, the iPhone route). Native OCR (ML Kit, Vision Camera frame processors) needs a development build and a gigabyte of Android toolchain downloads; not approved and not needed for the demo. `expo-camera`, `expo-image-manipulator` and `react-native-webview` all ship in Expo Go 57.
- **OCR engine: tesseract.js 5 inside a hidden `WebView`.** Hermes has no WebAssembly and no Web Workers, so the engine runs in the WebView's Chromium/WebKit. Scripts and the language model load from CDNs at first use (≈ 4 MB core + 11 MB `eng` model, cached by the WebView afterwards); the phone needs internet, which the NHTSA lookup needs anyway.
- **Downloads made for this slice** (approved by the request itself, recorded per the standing rule): npm `expo-camera ~57.0.5`, `expo-image-manipulator ~57.0.17`, `react-native-webview 13.16.1` (all SDK-pinned, installed 2026-09-13); `tesseract.js@5` installed **only in the scratch lab** (`$CLAUDE_JOB_DIR/tmp/ocr-lab`, not in the repo) to measure real confidence numbers; the app loads tesseract from jsdelivr at runtime and has no npm dependency on it.
- **Data source: NHTSA**, keyless and free — vPIC `DecodeVinValues` for the vehicle and `recalls/recallsByVehicle` for open campaigns. Both verified live on 2026-09-13; recorded responses are the test fixtures.
- **Single-shot flow** exactly as asked: capture → score → add or error. No continuous scanning, no manual correction of the read (parked, §16).

## 3. What the lab measured (grounds the confidence system)

16 VIN plates rendered with the installed Chrome (four styles: dashboard plate on brushed silver, door-jamb sticker in bold mono, a blurred/skewed/low-contrast plate, a glare band) and read by tesseract.js in node with the VIN whitelist and single-line page segmentation:

| model | correct | failures | per-symbol confidence on the *wrong* reads |
|---|---|---|---|
| `eng` (default, 11 MB) | 14 / 16 | `1`→`T` at position 1 on two Segoe-style plates | mean 98.5, min 93 |
| `eng` fast (2 MB) | 12 / 16 | the same two plus two **insertions** (18 characters) | mean 97–98 |

Timing 20–100 ms per plate in node; expect 0.5–3 s in a phone WebView. Two conclusions drive §6:

1. **The engine's own confidence cannot be the gate.** Wrong characters came back at 93–99 % confidence. Per-symbol confidence is one input, not the verdict.
2. **VIN structure is the strong signal.** Every failure is caught either by the length rule (insertions) or by the **check digit** (position 9) — the `1`→`T` error moves the weighted sum by 16 and the check digit no longer matches. Common OCR confusions in VIN context are also systematic (`1/T`, `5/S`, `7/T`, `8/B`, `6/G`, `2/Z`, `4/A`, `0/D`, `0/U`), so a bounded candidate search validated by the check digit recovers most misreads instead of failing them.

The default `eng` model is used (§16.3 parks the fast model as a one-line switch). Recorded outputs (text + per-symbol confidence for all 16 plates) are in `src/lib/__tests__/fixtures/ocr-lab.json` and are the unit-test inputs for §5–§6.

Sample VINs and their check digits (computed): `1HGCM82633A004352` valid (2003 Honda Accord EX-V6 coupé, NHTSA clean, 24 recalls), `JH4KA7561PC008269` valid (1993 Acura Legend, 4 recalls), `WBA3A5C57DF123456` invalid (BMW; European VINs do not carry a check digit — NHTSA still decodes it and flags code 1), `5YJ3E1EA7KF317654` invalid (a made-up Tesla). **The app's own demo VINs (`1FTVW1EL5NWG00001`, `5YJ3E1EA7KF317726`) have invalid check digits** — they are design placeholders; §6 treats them as trusted so scanning the VIN-help sample still adds the F-150 Lightning (§16.4).

## 4. Architecture

```
src/lib/vin.ts            pure: normalise, check digit, positional rules, candidate search, score        (Task 2)
src/lib/nhtsa.ts          fetch + map: decodeVin(vin) → DecodedVehicle | error, recallsFor(...) → Recall[] (Task 3)
src/ocr/ocrPage.ts        the WebView HTML (tesseract bootstrap + message protocol) as a string             (Task 4)
src/ocr/OcrEngine.tsx     hidden WebView + hook: useOcrEngine() → { status, progress, recognize(base64) }  (Task 4)
src/ocr/crop.ts           pure: guide rect (screen) → crop rect (photo pixels), cover-fit maths            (Task 5)
src/ocr/capture.ts        takePicture → manipulate(crop → resize → JPEG base64)                            (Task 5)
src/store/useAppStore.ts  ScreenId 'scan'; scan phase/result state; addScannedVehicle()                    (Task 6)
src/screens/scan/ScanScreen.tsx + ScanGuide.tsx + ScanResult.tsx                                            (Task 7)
src/overlays/OverlayHost.tsx  mounts ScanScreen at screen === 'scan'; back closes it                        (Task 7)
src/screens/AddVehicleSheet.tsx, src/screens/VinHelpScreen.tsx  the two "Scan" entry points open it        (Task 7)
```

Data flow: `ScanScreen` (camera) → `capture.ts` (crop+resize → base64 JPEG) → `OcrEngine.recognize` (WebView message) → `vin.ts` `readVin(symbols)` (candidate + local score) → if North-American check fails → **fail** (no network) → else `nhtsa.decodeVin` → final score (§6) → ≥ 90: `nhtsa.recallsFor` → `addScannedVehicle` → close → toast; < 90 → **fail** card.

## 5. VIN library — `src/lib/vin.ts` (pure, fully unit-tested)

```ts
export const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';          // no I, O, Q
export const TRANSLIT: Record<string, number> = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 }; // digits = value
export const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
export function checkDigit(vin: string): string        // weighted sum mod 11; 10 → 'X'; requires 17 chars of VIN_CHARS (position 9 may be X)
export function isNorthAmerican(vin: string): boolean   // first char in '1'..'5' — these VINs must carry a valid check digit
export function hasValidCheckDigit(vin: string): boolean
export function normalizeRead(text: string): string     // uppercase; strip everything not [A-Z0-9]; I→1, O→0, Q→0
export const AMBIGUOUS: [string, string][] = [['1','T'],['1','L'],['5','S'],['7','T'],['8','B'],['6','G'],['2','Z'],['4','A'],['0','D'],['0','U']];
export function positionalOk(vin: string): boolean      // pos 9 ∈ [0-9X]; pos 10 (model year) ∉ {0,U,Z}; positions 15–17 digits (ISO 3779); NA VINs additionally: positions 12–17 digits
export type Read = { text: string; symbols: { t: string; c: number }[] };   // what the OCR engine returns (§7)
export type VinCandidate = { vin: string; subs: number; deletions: number; ocrMean: number };
export function candidates(read: Read): VinCandidate[]  // §5.1
export type LocalVerdict = { vin: string | null; ocrMean: number; subs: number; structure: 'check-ok' | 'check-fail' | 'unchecked' | 'malformed'; reason: string };
export function readVin(read: Read): LocalVerdict       // §5.2
export function formatVin(vin: string): string          // '1HGC M826 33A0 0435 2' grouping for display (4-4-4-4-1)
```

### 5.1 Candidate search (bounded, deterministic)

1. `t = normalizeRead(read.text)`; per-symbol confidences are kept aligned with `t` (symbols whose text is stripped by normalisation are dropped in the same pass; a symbol with multi-character text is expanded with its confidence repeated).
2. If `t.length === 17` → base candidate. If `t.length === 18` → the 18 single-deletion variants are candidates with `deletions: 1` (the fast-model insertion case). Any other length → no candidates (`malformed`).
3. For every base candidate, positions whose character violates `positionalOk` **and** whose character has an ambiguous twin that would satisfy it are substituted deterministically (e.g. `S` at position 16 → `5`). Each counts as one `subs`.
4. For North-American candidates (`isNorthAmerican`), if the check digit fails: enumerate substitutions over ambiguous positions, **at most 2 substitutions**, positions considered in ascending order of symbol confidence, and keep those whose check digit validates. `subs` counts every substitution applied. Non-NA candidates are never check-digit searched (no validator exists) — only step 3 applies.
5. Result ordering: NA candidates with a valid check digit first, then fewest `deletions + subs`, then highest `ocrMean` (mean of the symbol confidences after substitution; a substituted symbol keeps its original confidence). `ocrMean` is on the 0–100 scale tesseract reports.

### 5.2 Local verdict `readVin`

- No candidates → `{ vin: null, structure: 'malformed', reason: 'Not a 17-character VIN' }`.
- Best candidate is NA with a valid check digit → `structure: 'check-ok'`.
- Best candidate is NA and no candidate validates → `{ vin: best.vin, structure: 'check-fail', reason: 'Check digit does not match' }` (the screen fails immediately, no network).
- Best candidate is non-NA (`positionalOk` after step 3) → `structure: 'unchecked'` — the NHTSA decode decides (§6).
- A candidate equal to a key of the app's `DECODE` demo table (`src/fixtures/decode.ts`) is returned as `structure: 'check-ok'` regardless of its check digit (§16.4).

## 6. Confidence system (0–100, gate = 90)

```
score = round( 0.6 · ocrMean + 0.4 · structure − 3 · subs − 6 · deletions ),  clamped to [0, 100]
structure = 100  when check-ok, or unchecked + NHTSA clean (§9)
          = 0    when check-fail, malformed, or NHTSA fatal
passes    = score ≥ 90
```

Worked cases from the lab: sticker `1HGCM82633A004352` read clean, ocrMean 98.9 → 0.6·98.9 + 40 = **99**. Dash plate read `THGCM82633A004352` (T at position 1, ocrMean 98.6): check fails, one `T→1` substitution validates → 59.2 + 40 − 3 = **96**. Fast-model insertion `1THGCM82633A004352` (18 chars): one deletion validates → 59 + 40 − 6 = **93**. Two substitutions and a deletion: 59 + 40 − 12 = 87 → **fail**. Any check-fail with no validating candidate: ≤ 60 → **fail**. A clean read at ocrMean 83 with a valid check digit: 49.8 + 40 = 89.8 → **fail** (rounds to 90? — `round` is applied to the final sum: 89.8 → 90 → passes; the rounding rule is deliberate and tested: the displayed number is the number that is gated).

The score is shown to the user in both outcomes (`96% MATCH` / `61% — TOO LOW`). `computeScore(verdict, nhtsa)` lives in `vin.ts` so the whole gate is pure and tested; the screen only sequences calls.

## 7. OCR engine — `src/ocr/ocrPage.ts` + `src/ocr/OcrEngine.tsx`

**Page** (a TypeScript string constant holding one HTML document):
- Loads `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js`; creates the worker with `workerPath` `…/tesseract.js@5/dist/worker.min.js`, `corePath` `https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js`, `langPath` `https://tessdata.projectnaptha.com/4.0.0` (default `eng`), `workerBlobURL: true`, `logger` forwarding `{status, progress}`.
- `setParameters({ tessedit_char_whitelist: VIN_CHARS, tessedit_pageseg_mode: '7' })` (PSM 7 = single text line; the numeric string is what tesseract.js expects).
- Messages page → app (`window.ReactNativeWebView.postMessage(JSON.stringify(m))`): `{ type: 'ready' }`, `{ type: 'progress', status, progress }` (0–1), `{ type: 'result', id, text, symbols: [{ t, c }] , ms }`, `{ type: 'error', id?, message }`.
- Messages app → page (via `injectJavaScript`): `window.__ocr.recognize(id, dataUrl)` where `dataUrl` is `data:image/jpeg;base64,…`. `recognize(image, {}, { text: true, blocks: true })` and symbols are flattened from `blocks → paragraphs → lines → words → symbols` (v5 shape, verified in the lab).
- Every message carries the `id` of the request so late results after a cancel are ignored.

**Component/hook** (`OcrEngine` mounted inside `ScanScreen`; `useOcrEngine()` returns `{ status: 'loading' | 'ready' | 'error', progress: number, recognize(base64: string): Promise<Read>, error?: string }`):
- The `WebView` is `style={{ position: 'absolute', width: 2, height: 2, opacity: 0.01 }}` (Android requires a laid-out, non-zero, non-invisible view for JS to keep running), `javaScriptEnabled`, `originWhitelist={['*']}`, `source={{ html: OCR_PAGE, baseUrl: 'https://ocr.recallhub.local/' }}` (an https base URL gives the page a secure origin so `blob:` workers and WebAssembly are allowed), `onMessage` parses JSON and dispatches; `mixedContentMode="always"` is **not** needed (everything is https).
- Timeouts: engine ready 45 s (else `status: 'error'`, copy §11 "Reader unavailable — check your connection and try again"); `recognize` 20 s per request → rejects. The engine warms up on mount, i.e. while the user is still framing; if Capture is tapped before `ready`, the screen shows "Preparing reader… 62 %" from `progress` and continues automatically.
- Tests replace `react-native-webview` with a mock (§14) and drive `onMessage` by hand.

## 8. Image pipeline — `src/ocr/crop.ts`, `src/ocr/capture.ts`

- Camera: `CameraView` (expo-camera) `facing="back"`, `ratio="16:9"` where supported, `enableTorch={torch}`, `onCameraReady`, `ref` for `takePictureAsync({ quality: 0.85, skipProcessing: false, base64: false })` → `{ uri, width, height }`. Android returns an upright image when `skipProcessing` is false (the module applies EXIF orientation); the mapping below assumes `width/height` describe the upright pixels.
- Guide rect (screen points): width `W − 32`, height `(W − 32) · 0.19` (a 17-character line is ≈ 5.3 : 1), centred horizontally, its centre at 42 % of the preview height. Corner marks only (§11).
- `cropRectFor(guide, preview, photo)` (pure): the preview shows the photo **cover-fitted** and centred; `s = max(preview.w / photo.w, preview.h / photo.h)`; the visible photo region is `(photo.w·s − preview.w)/2` … ; map `guide` through the inverse, clamp to the photo, and pad by 6 % of the guide height on every side so descenders and the frame edge survive.
- `captureVin(cameraRef, guide, preview)` → `ImageManipulator.manipulate(uri).crop(rect).resize({ width: 1400 })` (upscaling short crops is what makes tesseract read them), `renderAsync()`, `saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true })` → `base64`. The resize keeps aspect (height auto). Total pipeline target < 700 ms on the S24 Ultra.

## 9. NHTSA client — `src/lib/nhtsa.ts`

```ts
export type DecodedVehicle = { vin: string; make: string; model: string; year: string; trim: string; body: string; fuel: string; plant: string; errorCodes: string[]; errorText: string };
export type NhtsaRecall = { campaign: string; code: string; component: string; summary: string; remedy: string; consequence: string; date: string /* ISO yyyy-mm-dd */; parkIt: boolean };
export async function decodeVin(vin: string, fetchImpl = fetch): Promise<DecodedVehicle>       // GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json, 12 s timeout via AbortController
export async function recallsFor(v: { make: string; model: string; year: string }, fetchImpl = fetch): Promise<NhtsaRecall[]>  // GET https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear= (URL-encoded), 12 s timeout; [] on Count 0
export function nhtsaOutcome(d: DecodedVehicle, northAmerican: boolean): 'clean' | 'fatal'   // §9.1
export function vehicleFromDecode(d: DecodedVehicle, recalls: NhtsaRecall[], rawVin: string): Vehicle   // §10
```

### 9.1 Error codes (from the recorded responses)

`ErrorCode` is a comma-separated list. Observed: `0` clean ("Check Digit is correct"), `1` check digit does not calculate (also raised for European VINs that have no check digit, e.g. the BMW), `6` incomplete VIN (16 chars), `7` manufacturer not registered (the `T…` misread: `"1,7"` with an empty Make). Rule: **fatal** when `Make` is empty **or** codes include `6` or `7` **or** (`northAmerican` and codes include `1`); otherwise **clean**. Code `1` alone on a non-NA VIN is not fatal (the BMW decodes to 2013 BMW 328i). Other codes (8 no detailed data, 14 unused position, …) are informational.

### 9.2 Recall mapping

`campaign` `19V182000` → `code` `NHTSA 19V-182` (the app's existing code style, e.g. `NHTSA 23V-742`); `component` title-cased with `:` → ` · ` (`AIR BAGS:FRONTAL:DRIVER SIDE:INFLATOR MODULE` → `Air bags · Frontal · Driver side · Inflator module`); `date` from `ReportReceivedDate` which the API returns as **DD/MM/YYYY** (`15/01/2020`); the list is sorted newest first. `parkIt`/`parkOutSide` are optional in the API and default to false.

## 10. Store — `src/store/useAppStore.ts`

- `ScreenId` gains `'scan'`. `openScreen('scan')` is used by both entry points; `closeScreen()` closes it; `switchTab` already clears `screen`.
- New state: `scan: { phase: 'idle' | 'reading' | 'checking' | 'added' | 'failed'; score: number | null; vin: string | null; vehicleName: string | null; reason: string | null }` with `resetScan()`; `setScan(patch)`. The phases: `reading` (OCR in flight), `checking` (NHTSA in flight), `added` (success card), `failed` (error card). Kept in the store so tests can drive the screen without a camera.
- `addScannedVehicle(v: Vehicle)`: appends, `idx` = last, closes **both** `screen` and `sheet`, clears `vin`, and `flash(v.name + ' added · ' + (v.recall ? '1 recall found' : 'monitoring for recalls'))`.
- `vehicleFromDecode` (in `nhtsa.ts`) builds the `Vehicle`: `name` = `${Model} ${Trim}`.trim() (e.g. `Accord EX-V6`), `meta` = `${year} ${TitleCase(Make)} · ${Body}` (`2003 Honda · Coupe`), `health` 90, `range` `'—'`, `vin` = `maskVin(raw)`, `sync` `'SYNCED JUST NOW'`, `recall` = newest NHTSA recall as `{ code, title, remedy, summary, date }` or `null`; telemetry constants as `addVehicle` uses today (`odo 8410, oilIn 4800, tireIn 2600, brakeIn 21000, regDays 240, psi '40 / 40', battery 99`) — parked in §16.6.
- `Recall` (`src/fixtures/types.ts`) gains optional `remedy?: string; summary?: string; date?: string`; `allRecalls` (`src/lib/recalls.ts`) uses `v.recall.remedy ?? LIVE_RECALL.remedy` and `done: v.recall.date ? 'Reported ' + longDate(date) : LIVE_RECALL.doneOpen` (scheduled state unchanged). Nothing else in the recall screens changes; codes without a `REASONS` entry already fall back to `EMPTY_REASON`.
- Demo VINs (§16.4): when the read equals a `DECODE` key, `addScannedVehicle` is given the vehicle `addVehicle` would have built (`decodeVin` from `derive.ts`), with `recall: null`, and no NHTSA call is made.

## 11. Scanner screen — `src/screens/scan/`

Full-screen overlay (`screen === 'scan'`) mounted by `OverlayHost` **after** the sheets and before the toast, so it covers the Add sheet it was opened from; hardware back closes it (the generic screen branch already does). Dark chrome — the app's only dark palette is the chat family; the scanner uses `color.splash` `#08080A` for the frame and `color.textOnDark` for type.

**Live state (`phase: 'idle'`)**
- `CameraView` fills the screen. A scrim (`rgba(8,8,10,0.62)`) covers everything except the guide window, built from four absolutely-positioned views around the rect (no mask needed). The guide window has four **corner marks** (18 px legs, 2 px, `#FFFFFF`, r 6 outer) and a 1 px `rgba(255,255,255,0.35)` hairline.
- Header row (`paddingTop: insets.top + 8`, `paddingHorizontal 16`): 38 px round close button (`close-line` 22, `rgba(255,255,255,0.14)` fill, `accessibilityLabel="Close"`) left; centred `Mono 10 ls 1.8 textOnDark` caption `SCAN VIN`; 38 px torch button right (`flashlight-line` / `flashlight-fill` when on, same fill, `accessibilityLabel="Torch"`).
- Under the guide (16 px below): `Sans 15/500 textOnDark center` "Line up the VIN inside the frame" and `Sans 13 rgba(255,255,255,0.72) center` "Dashboard plate, door sticker or registration card".
- Bottom (`paddingBottom: insets.bottom + 24`): `MetalButton tint="default" label="Capture" icon="camera-fill" width={168} height={52} fontSize={14}` centred; beneath it `Mono 9 ls 1.4 rgba(255,255,255,0.55)` reader status: `READER READY` / `PREPARING READER · 62%` / `READER UNAVAILABLE`.
- Permission not yet granted: request on mount; while undetermined show the frame with `Sans 14` "Camera access is needed to scan your VIN" and a `MetalButton tint="blue" label="Allow camera" icon="camera-line"`; if denied and `canAskAgain` is false, the button reads `Open settings` and calls `Linking.openSettings()`. Copy sits where the guide would be.

**Reading (`phase: 'reading' | 'checking'`)**
- The captured crop (base64) is shown inside the guide in place of the live preview (`Image` from expo-image, `contentFit="cover"`), a 2 px `color.blue` scan line sweeps top→bottom over it (`withRepeat(withTiming(…, { duration: 900 }))`), the caption reads `Sans 15/500` "Reading VIN…" then "Checking with NHTSA…"; the Capture button is replaced by nothing (no cancel — the whole step is ≤ 3 s; back still closes).

**Result card (`phase: 'added' | 'failed'`)** — a panel sliding up from the bottom over the dark frame (`translateY` over `dur.sheet`, `bez(ease.sheet)`), `color.surface`, top radii 22, `paddingHorizontal 20`, `paddingTop 18`, `paddingBottom insets.bottom + 22`, `gap 14`:
- `added`: `StatusChip bg="#E3F5F1" fg={color.teal} icon="checkbox-circle-fill" label="96% MATCH"` (the real score); `Mono 17 ls 2.4 ink` the VIN grouped 4-4-4-4-1 (`formatVin`); `Sans 22/600 ls −0.5 ink` the vehicle name and `Sans 13 ink5` its meta; a recall line when present: `Sans 13 red` `alarm-warning-fill` + "1 open recall — NHTSA 19V-182"; `Sans 12 ink5` "Added to your garage". The card stays **1600 ms** then the screen closes itself (store `addScannedVehicle` already closed the sheet; the Garage rail is on the new car; the toast shows). A `MetalButton tint="blue" label="Done" icon="check-line" width="auto" flex={1} height={48}` closes it sooner.
- `failed`: `StatusChip bg={color.dangerBg} fg={color.dangerInk} icon="error-warning-fill" label="61% — TOO LOW"` (or `NO VIN FOUND` when the read is malformed, `READER UNAVAILABLE` on an engine error, `NO CONNECTION` when NHTSA is unreachable); `Sans 20/600 ls −0.4 ink` "Couldn't read the VIN"; `Sans 13/19 ink5` reason line from the verdict ("Check digit does not match", "Not a 17-character VIN", "NHTSA could not decode this VIN", "Confidence below 90 %"); `Sans 13/19 ink2` tip "Fill the frame, avoid glare and hold the phone steady, then try again."; buttons row: `MetalButton tint="default" label="Try again" icon="restart-line" width="auto" flex={1} height={48}` (→ `phase: 'idle'`, live camera again) and `OutlinePill label="Type it instead" icon="keyboard-line" height={48}` (→ close the scanner; the Add sheet is still open beneath with the best-guess VIN prefilled in the field when one exists).

Icons used (all present in the glyph map; add to `USED_ICONS`): `camera-fill`, `flashlight-line`, `flashlight-fill`, `check-line`, `scan-line`, `camera-off-line`, `alarm-warning-fill` (exists), `restart-line` (exists), `keyboard-line` (exists), `error-warning-fill` (exists).

## 12. Entry points

- `AddVehicleSheet`: the `Scan` chip's `onPress` becomes `openScreen('scan')` (the "not wired up" flash is removed). When the scanner closes via "Type it instead" with a best-guess VIN, `vin` in the store is set to it so the field shows it.
- `VinHelpScreen` footer `Scan`: `closeVinHelp(); openSheet('add'); openScreen('scan')` — the sheet opens beneath so a close returns to it (same as manual).
- `GarageScreen` / `RecallsScreen` "Add Vehicle" buttons are unchanged (the sheet remains the hub).

## 13. Permissions and config

`app.json`: plugin `["expo-camera", { "cameraPermission": "Recall Hub uses the camera to read your vehicle's VIN." }]`, `android.permissions: ["CAMERA"]`, `ios.infoPlist.NSCameraUsageDescription` (same string). None of this affects Expo Go (it carries its own manifest); it is correct for a future build. On the emulator, grant with `adb shell pm grant host.exp.exponent android.permission.CAMERA`.

## 14. Tests and mocks

`jest.setup.ts` gains three mocks in the Slice 3 style: `expo-camera` (`CameraView` → forwardRef `View` `testID="camera-view"` exposing `takePictureAsync` on the ref as `jest.fn(async () => ({ uri: 'file:///photo.jpg', width: 4000, height: 3000 }))`; `useCameraPermissions` → `[{ granted: true, status: 'granted', canAskAgain: true }, jest.fn(async () => ({ granted: true }))]` with a module-level setter so a test can flip it to denied), `expo-image-manipulator` (`ImageManipulator.manipulate` → chainable `{ crop, resize, renderAsync }` whose `saveAsync` resolves `{ uri: 'file:///crop.jpg', width: 1400, height: 266, base64: 'QUJD' }`; `SaveFormat.JPEG`), `react-native-webview` (`WebView` → forwardRef `View` `testID="ocr-webview"`; the ref's `injectJavaScript` is a `jest.fn`; the mock records the latest `onMessage` so tests can post `{ type: 'ready' }` / `result` messages). `expo-image` needs no mock beyond what jest-expo provides.

Unit tests: `vin.test.ts` (check digit on the four sample VINs and the two demo VINs; normalisation; every ocr-lab fixture row → expected verdict/score; the worked cases in §6; ambiguity search bounds), `nhtsa.test.ts` (mapping from the recorded fixtures incl. the `1,7` fatal, the BMW code-1-non-fatal, the 16-char code 6, recall date parsing, empty results, timeout → rejects), `crop.test.ts` (cover-fit maths for a 4000×3000 photo in a 412×915 preview and a portrait photo), `OcrEngine.test.tsx` (ready/progress/result/error protocol, request ids, timeouts with fake timers), `useAppStore.test.ts` additions (`addScannedVehicle`, `scan` state, `openScreen('scan')`), `ScanScreen.test.tsx` (permission states; capture → reading → added with the engine mock and a fetch mock returning the Honda fixtures; the failed card and Try again; Type it instead prefills the VIN), `OverlayHost.test.tsx` (scan mounts; back closes), `AddVehicleSheet.test.tsx` (Scan chip opens the scanner), `assets.test.ts` (new glyphs).

## 15. Verification plan (controller, Task 8)

- Emulator: point the virtual-scene camera at a rendered plate by editing `%LOCALAPPDATA%\Android\Sdk\emulator\resources\Toren1BD.posters` (`poster wall … default <file>` → a copy of the lab's `dash-1HGCM82633A004352.png` placed in that folder) and launching with `-camera-back virtualscene`; grant CAMERA to Expo Go; walk Garage → Add Vehicle → Scan → Capture; expect `96–99% MATCH`, "Accord EX-V6 · 2003 Honda · Coupe", the recall line, the toast, the rail on the new car with a red pager dot, and the Recalls tab listing `NHTSA 19V-182`. Then a plate with the made-up Tesla VIN → `TOO LOW` with "Check digit does not match". Captures to `docs/reference/emu-scan-*.png`; record in `verification.md` (new "Slice 4" section). If the virtual scene will not show the poster, fall back to the sticker PNG on the emulator's wall via the extended-controls file and note it.
- Phone (Task 9, with the other phone passes): the real dashboard plate of the user's car in daylight and under glare; first-run model download time on LTE; torch.

## 16. Parked decisions (made on the user's behalf; overrule any of them)

1. **Tesseract-in-WebView instead of native ML Kit.** Keeps Expo Go and avoids a ~1 GB toolchain download. Accuracy on real plates will be lower than ML Kit; the confidence gate is what makes that safe. If the demo needs better first-shot accuracy, the same `OcrEngine` interface can be backed by a native module in a dev build later.
2. **Weights of the score** (0.6 OCR / 0.4 structure, −3 per substitution, −6 per deletion, gate 90) are tuned on the 16 lab plates only; the phone pass may retune them.
3. **Default `eng` model (11 MB)** over `eng` fast (2 MB): 14/16 vs 12/16 in the lab. One string in `ocrPage.ts` switches it.
4. **The app's demo VINs are trusted.** The VIN-help page shows `1FTVW1EL5NWG00001`, whose check digit is invalid (design placeholder). Scanning it adds the F-150 Lightning from the demo table without NHTSA, so the in-app sample keeps working.
5. **Automatic add at ≥ 90**, as asked; the success card is informational (1.6 s, or Done). A confirm-before-add variant is one flag in `ScanScreen`.
6. **Telemetry of a scanned vehicle** (odometer, service intervals, tyre pressure, battery) reuses the constants `addVehicle` already uses — the demo has no source for them.
7. **Only the newest NHTSA recall** becomes the vehicle's live recall (the app models one live recall per vehicle). The count is in the toast; the list is not stored.
8. **No manual correction of a low-confidence read** on the result card ("Type it instead" prefills the sheet instead).
9. **Manual entry's validator is untouched** (`vinOk` = length ≥ 11, from Slice 1); tightening it to the scanner's rules would change the design's manual flow.
