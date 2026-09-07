# Task 22 report — emulator verification pass, blur tuning, verification.md (done by the controller, session 5, 2026-09-07)

Status: DONE_WITH_CONCERNS

- 12 emulator captures in `docs/reference/emu-*.png` (11 reference states + splash stub), compared per screen; record in `docs/reference/verification.md`.
- Blur tokens settled by side-by-side crops at matched physical scale: `face` 55, `scrim` 7.
- Fixed: VIN-help Scan button icon order (`src/screens/VinHelpScreen.tsx`); Android back exiting the app over open overlays (`src/overlays/OverlayHost.tsx` + new `src/overlays/__tests__/OverlayHost.test.tsx`, verified on the emulator).
- Concerns parked for a decision (in verification.md, "NOT fixed"): VIN placeholder colour (reference #757575 = Chromium default vs `ink7`); fast injected fling on the rail not advancing (verify by finger in Task 23).
- Deferred emulator checks absorbed: Tasks 10 (fonts/icons render), 11 (metal button idle shimmer), 15 (health gauge), 16 (garage layout; `expo start` generated `.expo/types`, typed-route hrefs typecheck clean), 17 (stats screen).
- Gate: `npm test` 23 suites / 116 tests, `npm run typecheck` clean.
