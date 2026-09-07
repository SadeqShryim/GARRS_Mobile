### Task 23: On-device pass on the S24 Ultra

**Files:**
- Modify: `docs/reference/verification.md` (append the on-device section)

**Interfaces:**
- Consumes: the finished app. Produces: the user's sign-off, recorded.

- [ ] **Step 1: Put the phone on the same Wi-Fi as this PC** (or connect USB with USB debugging on and run `adb devices` to confirm it is listed).

- [ ] **Step 2: Start Metro for a physical device**

Run: `npx expo start` — for Wi-Fi scan the QR code with Expo Go on the S24 Ultra; for USB, `npx expo start --android` with only the phone connected (stop the emulator first so `adb` targets the phone). If the phone cannot reach Metro over Wi-Fi, use `npx expo start --tunnel`.

- [ ] **Step 3: Walk the golden path on the device with the user watching**

Splash stub → tap → Garage → swipe the rail both ways past the ends → tap a neighbour card (centres) → tap the active card (stats; gauge sweeps) → back → Add Vehicle → Use sample VIN → info → VIN help → Enter manually → Add to garage (rail scrolls to the F-150, toast) → alert row → Schedule Repair (toast, card clears) → each tab (hump slides, icons cross-fade).

- [ ] **Step 4: Append to `verification.md`**

```markdown
## On-device — Samsung S24 Ultra
Date: <date>   Expo Go version: <from the app's About screen>   Display mode: <FHD+ / QHD+ from Settings ▸ Display>
- 120 Hz: hump slide, card dimming, gauge sweep, metal spin — smooth / janky (note which)
- Glass: card face blur visible over the glow — yes / no
- Keyboard: add sheet stays above the keyboard — yes / no
- Gesture inset: tab bar sits above the nav bar with white beneath — yes / no
- Anything that differs from the emulator: <list or none>
User sign-off: <name / date>
```

- [ ] **Step 5: Checkpoint** — "docs: on-device verification on S24 Ultra"

---

## Self-review notes (already applied)

- **Spec coverage:** §3 sizing → Tasks 13, 16 (`railPadding`, insets); §4 architecture → Tasks 10, 13, 14, 17; §5 store/fixtures/derivations → Tasks 6–9; §6 tokens → Task 5; §7 primitives → Tasks 10–15; §8 screens → Tasks 16–21; §9 effects → Tasks 4, 11, 12, 14 and the flags in Task 22; §10 assets/fonts/icons → Tasks 4, 10; §11 dependencies → Task 1; §12 verification → Tasks 2, 3, 22, 23; §13 risks → called out in Tasks 11 (shadow clipping) and 22 (blur tuning); §14 acceptance → Task 22 table + Task 23.
- **Type consistency:** `Icon.name` is `IconName | string`, so fixtures typed as `string` compose; `MetalButton.width` is `number | 'auto'` everywhere it is passed (`'auto'` in Tasks 17 and 20); `Stats.service[].pct` is a number, rendered as `${pct}%` in Task 17 and asserted as `80/43/63` in Task 7; `GlowCard.faceStyle` replaces the spec's `facePadding` wording — same intent, one prop.
- **Order of overlays** in `OverlayHost` after Task 21: add sheet → recall sheet → VIN help → Toast → SplashStub, matching z-indices 20 / 20 / 27 / 30 / 60.
