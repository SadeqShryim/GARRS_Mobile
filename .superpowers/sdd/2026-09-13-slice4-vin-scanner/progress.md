# Slice 4 — VIN scanner — execution ledger

Spec: `docs/superpowers/specs/2026-09-13-slice4-vin-scanner-design.md`. Plan: `docs/superpowers/plans/2026-09-13-slice4-vin-scanner.md` (each task's section is its brief; the spec is binding when they disagree). Mode: subagent-driven, one fresh implementer per task, no reviewer dispatches; gate `npm test && npm run typecheck` re-run by the controller; implementers never run git; the controller commits per task with explicit paths (never the untracked `Recording 2026-09-10 011300.mp4`).

## Session 9 — 2026-09-13

- User request (verbatim intent): turn the demo link off; build a camera VIN OCR scanner with a confidence system — ≥ 90 % adds the vehicle and pulls its data, below shows an error asking to try again.
- Demo link switched off (cloudflared + Metro stopped; the private link page now says so).
- Research: codebase map (Explore agent), Expo SDK 57 API facts (research agent), OCR lab in `$CLAUDE_JOB_DIR/tmp/ocr-lab` (tesseract.js 5 in node on 16 Chrome-rendered plates; results in the spec §3 and in `src/lib/__tests__/fixtures/ocr-lab.json`), NHTSA endpoints verified live and recorded into `src/lib/__tests__/fixtures/nhtsa/`.
- Downloads this slice (approved by the request; nothing else): npm `expo-camera ~57.0.5`, `expo-image-manipulator ~57.0.17`, `react-native-webview 13.16.1`; `tesseract.js@5` only in the scratch lab.
- Task 1: complete (controller) — deps, `app.json` camera permission/plugin, jest mocks (`__cameraMock`, `__manipulatorMock`, `__webviewMock`), six glyphs in `assets.test.ts`, fixtures. Gate: 42 suites / 256 tests, typecheck clean after typing the manipulator mock.

## Task status

| Task | Status | Notes |
|---|---|---|
| 1 deps/config/mocks | done | controller |
| 2 vin.ts | done — 90842b2 | opus; 35 tests; two load-bearing refinements folded into spec §5.2 (check-ok for untouched non-NA reads; "possibly NA" gate on the step-4 search); two score edges parked in §16.2 |
| 3 nhtsa.ts | done — 02b9596 | sonnet; 21 tests; fatal-code rule, DD/MM recall dates, `Recall.remedy/summary/date` on vehicles |
| 4 OCR engine | done — d8b2cd3 | opus; 14 tests; id-less error breaks the engine; unmount rejects in-flight; `useOcrEngine` outside a provider returns a broken engine |
| 5 crop/capture | done — 66100ca | sonnet; 18 tests; EXIF 3/6/8 mapping analytically derived, unverified on iOS |
| 6 store | done — 0bc128d | sonnet; 7 tests; `closeScreen` resets scan only when closing the scanner |
| 7 ScanScreen + entry points | done — e64d283 (+ bb71db2 layout fix, beeaffa toast timing) | opus; 26 tests; keeps the scanner mounted through the added phase; late results discarded after unmount |
| 8 emulator verification + docs | done — 2026-09-13 | eight captures, verification.md Slice 4 section, CLAUDE.md, WHERE-WE-LEFT-OFF.md, spec §15.1/§16.10–12 |
| 9 phone pass (the real camera read) | pending | with Slices 1–3's phone passes — the emulator cannot take a real still |

Controller fix during the wave: the two `type` aliases inside the `expo-image-manipulator` jest.mock factory tripped babel-plugin-jest-hoist ("Invalid variable access: Rec") and broke every suite; renamed `MockRec`/`MockCtx` (identifiers inside a mock factory must be `mock`-prefixed) — 1467376.

Controller check between waves: the compiled `OCR_PAGE` was served over http with a `ReactNativeWebView` shim and driven in the installed Chrome over CDP (`$CLAUDE_JOB_DIR/tmp/ocr-page/check.mjs`): `ready` after 1.3 s (CDN core + best-int model), three plates recognised in 28–65 ms with 17 symbols each — `1HGCM…` dash plate read as `THGCM…` exactly as in the lab (the library's substitution recovers it), `JH4KA7561PC008269` and `5YJ3E1EA7KF317654` clean. The page, the protocol and the CDN URLs are sound; what remains unverified is only the RN WebView host itself.

### RESUME HERE (supersedes the block above)
CURRENT STATE: Slice 4 is code complete **and emulator-verified** (Tasks 1–8). Gate: 49 suites / 381 tests, typecheck clean. Everything committed per task and pushed to origin/main on 2026-09-13. Twelve decisions parked in the spec §16.
NEXT: Task 9 — the real camera read on the S24 Ultra (WHERE-WE-LEFT-OFF.md "Resume here" item 0 has the checklist), together with the earlier slices' phone passes. If plates score low, retune `computeScore` (spec §16.2). Candidates after that: a `NOT RECOGNISED` label (§16.11), an `EXPO_PUBLIC_SCAN_FIXTURE` emulator harness (§16.12), tesseract.js 7 (§16.3).
