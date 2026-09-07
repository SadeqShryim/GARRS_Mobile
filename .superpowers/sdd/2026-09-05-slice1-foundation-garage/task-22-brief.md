### Task 22: Emulator verification pass, blur tuning, `verification.md`

**Files:**
- Create: `docs/reference/verification.md`, `docs/reference/emu-*.png`
- Modify: `src/theme/tokens.ts` (final `blur` values only)

**Interfaces:**
- Consumes: every reference PNG from Task 3 and every screen from Tasks 13–21.
- Produces: the fidelity record the spec's acceptance criteria point at. No new code.

- [ ] **Step 1: Capture the emulator at every reference state**

With the app running on `s24proxy`, drive it by hand (or `adb shell input tap x y`) to each state and capture with `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" exec-out screencap -p > docs/reference/emu-<name>.png` for: `garage-idle`, `garage-card2`, `stats-model-s`, `stats-taycan`, `sheet-add-empty`, `sheet-add-sample`, `vin-help`, `sheet-recall`, `garage-added-toast`, `tab-recalls`, `tab-profile`, plus `splash-stub`.

- [ ] **Step 2: Compare each pair with the Read tool, side by side**

Check, per screen, in this order: spacing and alignment → type size/weight/tracking → colours → state-dependent content → motion (by eye on the emulator). Record every difference. Fix anything that is a mistake; record anything that is a platform limit.

- [ ] **Step 3: Tune the blur intensities**

Compare the Model S card face in `emu-garage-idle.png` against `garage-idle.png`: the glow behind the frosted face should look equally soft. Adjust `blur.face` in `src/theme/tokens.ts` (try 30 → 40 → 55) and reload until they match; do the same for `blur.scrim` against `sheet-add-empty.png` (the garage behind the sheet should be *barely* softened). Write the final numbers into `tokens.ts` and note them in `verification.md`.

- [ ] **Step 4: Write `docs/reference/verification.md`**

```markdown
# Slice 1 verification — Garage tab on Android emulator (s24proxy, Pixel 8 / API 35)

Date: <fill with today's date>
Reference: docs/reference/<name>.png (design, 430×932 @2x)   Emulator: docs/reference/emu-<name>.png (411 dp @2.625x)

| Screen | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Garage idle | garage-idle.png | emu-garage-idle.png | match / diff | |
| Garage card 2 | garage-card2.png | emu-garage-card2.png | | |
| Stats — Model S | stats-model-s.png | emu-stats-model-s.png | | |
| Stats — Taycan | stats-taycan.png | emu-stats-taycan.png | | |
| Add sheet empty | sheet-add-empty.png | emu-sheet-add-empty.png | | |
| Add sheet sample | sheet-add-sample.png | emu-sheet-add-sample.png | | |
| VIN help | vin-help.png | emu-vin-help.png | | |
| Recall sheet | sheet-recall.png | emu-sheet-recall.png | | |
| Added + toast | garage-added-toast.png | emu-garage-added-toast.png | | |
| Tab bar — recalls | tab-recalls.png (bar only) | emu-tab-recalls.png | | stub body is by design |
| Tab bar — profile | tab-profile.png (bar only) | emu-tab-profile.png | | stub body is by design |
| Splash stub | — | emu-splash-stub.png | n/a | stub, replaced in slice 6 |

## Known, accepted differences (from the spec §9)
- Rail flick deceleration is the platform's, not the source's 420 ms ease-out cubic. Centring, neighbour dimming and infinite wrap match.
- Metal button has no hover speed on touch; idle 7 s and pressed 2.33 s only.
- Glow blob baked once at 210/16 px and scaled to 190 for the vehicle card (source blur 14).
- Blur intensities: face = <final>, scrim = <final> (expo-blur has no px→intensity formula; tuned by eye against the references).

## Differences found and fixed during this pass
- <one line each, or "none">

## Differences found and NOT fixed (need a decision)
- <one line each, or "none">
```

Fill every `<…>` before finishing; leave no placeholders in the committed file.

- [ ] **Step 5: Run the full suite one more time** — `npm test && npm run typecheck` → PASS.

- [ ] **Step 6: Checkpoint** — "docs: slice 1 emulator verification record; final blur tokens"

---

