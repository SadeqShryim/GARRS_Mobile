# Slice 2 — The real Splash (marquee → crash photo → glass bubble → auth)

**Date:** 2026-09-09
**Status:** approved by construction — the user asked to "start slice 2 with the real splash screen"; open questions are parked in §15 rather than asked (standing instruction). Built and emulator-verified 2026-09-10 (see `docs/reference/verification.md`, Slice 2 section).
**Source of truth:** `design_handoff_recall_hub/design/Splash.dc.html` (one artboard: the template first, then `class Component extends DCLogic`). Where this spec and the source disagree, the source wins. Measured DOM geometry of the source at 430 × 932 is in `docs/reference/splash-geometry.json`; the reference PNGs are `docs/reference/splash-*.png` (captured by `scripts/splash-refs.mjs`).

## 1. Purpose

Replace the Slice 1 splash **stub** with the real Splash artboard, pixel-faithfully: the accelerating, motion-blurred diagonal marquee, the cut to the crash photo, the liquid-glass speech bubble, and the three-step auth screen over drifting colour blobs. It keeps the stub's contract (`onDone` → `dismissSplash()`), so nothing else in the app changes.

Fidelity is the primary requirement. Where a choice is between "what a conventional app would do" and "what the design does", do what the design does.

## 2. Scope

**In:**
- The whole `Splash.dc.html` artboard — it is one component with one `onDone`, and `onDone` is only reachable from the auth phase, so the marquee cannot ship without the auth steps:
  - Phase `run`: 6-row rotated marquee of photo tiles and telltale tiles, accelerating with motion blur and zoom; centred logo mark.
  - Phase `photo`: cut to `crash-hero.jpg` with the top/bottom veil.
  - Phase `bubble`: photo blurs/darkens and drifts larger; the glass bubble pops in and holds.
  - Phase `fade`: bubble fades out, colour blobs fade in.
  - Phase `auth`: header, serif display line, Google/Apple pills, OR divider, email → password → confirm fields, error line, Go back, footer.
  - The `REPLAY` pill (top-right, always visible) — it is part of the artboard and useful for the demo.
- `@shopify/react-native-skia` (pinned by `npx expo install`, bundled in Expo Go) for the marquee, the photo's live filter, and the bubble's backdrop filter.
- Instrument Serif via `@expo-google-fonts/instrument-serif`.
- Baked blob PNGs (extends `scripts/bake-assets.mjs`); the design's tile/hero JPEGs copied verbatim into `src/assets/images/`.
- Reference-capture script `scripts/splash-refs.mjs` (installed Chrome over CDP, no downloads) — already written and run.
- Removal of `SplashStub` (+ its test); `Splash` mounts in `OverlayHost` in its place.
- Tests: pure timeline maths and auth step logic; component tests for the auth flow and the phase progression (Skia mocked).

**Out:** real OAuth or account creation (both `onDone`), Recalls/Service/Hub/Profile, iOS verification, `expo-glass-effect`, a shipping variant of the `Did you f*cking check?` copy.

## 3. Target platform and sizing

- **Device:** Samsung S24 Ultra — Android 14+, ~412 dp logical width, 120 Hz; emulator proxy `s24ultraProxy` (Pixel 8, 411 dp). iOS secondary.
- **Sizing rule (unchanged from Slice 1):** the design frame is 430 × 932; every value is dp and is used as-is. Things that depend on the frame size are re-expressed from `useWindowDimensions()`:
  - Marquee wrap width `240vmax` → `2.4 × max(width, height)`; the wrap is centred on the screen centre.
  - Vignette radii `118% 76%` → `rx = 1.18 × width`, `ry = 0.76 × height` (CSS radial-gradient sizes are radii).
  - Photo cover: `background-size: cover; background-position: 50% 40%` → cover rect computed from the image's natural size and the window.
  - Blob boxes: CSS `left/right/top/bottom` offsets resolved against the window.
- **Safe areas:** the splash is full-bleed under the status bar and the gesture bar (dark everywhere). Header top padding = `22 + insets.top`; REPLAY top = `14 + insets.top`; footer bottom padding = `30 + insets.bottom`. The mark and the bubble are centred in the *full* window (the design centres them in the frame). Status bar style is **light** while the splash is mounted (RN `StatusBar` props stack, so the root's `dark` returns when it unmounts).
- **Keyboard:** `softwareKeyboardLayoutMode: resize` (already set). The auth column is `flex: 1` centred, so it compresses above the keyboard like the design would in a shorter viewport; the Skia canvas and blobs are sized from the window and are not affected.

## 4. Architecture

```
src/screens/splash/
  Splash.tsx             composition, timeline hook, REPLAY, StatusBar light, Android back → previous auth step
  timeline.ts            constants + pure maths (tile(k), row lists, marquee kinematics, blur/scale ramps, cover rect, schedule)
  useSplashTimeline.ts   phase state machine (setTimeouts) → Reanimated shared values with the CSS transition semantics
  useMarqueeDrive.ts     useFrameCallback → dist / t / sigma / scale shared values (mocked in tests)
  Stage.tsx              the single Skia <Canvas>: Marquee, Vignette, Photo (+ live filter), Veil, BubbleBackdrop
  Marquee.tsx            Skia children of Stage: 6 rows × 14 tiles, shadows, glyphs, the blur layer
  Mark.tsx               RN logo mark (54 tile + RECALL HUB)
  Bubble.tsx             RN bubble face (gradient, inset shadows, highlight, copy); reports its frame for the backdrop
  Blobs.tsx              RN: 4 baked blob PNGs drifting + the .42 scrim
  AuthPanel.tsx          RN auth UI (header, steps, fields, footer) + StepIn entrance animation
  auth.ts                pure step logic (validators, next/back reducer)
  GlassPill.tsx, GlassField.tsx, GoogleMark.tsx, ReplayPill.tsx
src/fixtures/splash.ts   TILES, GLYPHS, copy strings — verbatim from the source
src/theme/tokens.ts      + splash colours, easings (css, inOut, bubble), font.serif400
src/ui/Txt.tsx           + Serif
app/_layout.tsx          + InstrumentSerif_400Regular in useFonts
jest.setup.ts            + @shopify/react-native-skia mock
scripts/bake-assets.mjs  + blob-1..4.png
src/assets/images/       tile-1..5.jpg, crash-hero.jpg (verbatim copies), blob-1..4.png (baked)
src/overlays/OverlayHost.tsx   {splash && <Splash onDone={dismissSplash} />}   (SplashStub deleted)
```

**Why one Skia canvas.** The CLAUDE.md analysis stands: the marquee's blur ramps continuously over 84 moving tiles and must be one filter pass. Skia draws all tiles into one offscreen layer whose paint carries the blur (`Group layer`), and every animated value is a Reanimated shared value consumed on the UI thread — no JS involvement per frame. The crash photo lives in the same canvas so its `blur(11px) brightness(.6) saturate(.9)` transition is exact (RN's `filter` blur is Android-only and `expo-blur` cannot sample content drawn by Skia or by a `RenderEffect`), and the bubble's `backdrop-filter: blur(16px) saturate(1.6)` is a Skia `BackdropFilter` over the same canvas, clipped to the bubble's rounded rect and driven by the same pop transform as the RN face.

**Verified on the emulator before writing this spec** (probe run on `s24ultraProxy`, Expo Go 57, Skia 2.6.2): image tiles, a Remixicon glyph drawn from the TTF via `useFont`, a shared-value blur layer under a rotation group, and a composed blur + colour-matrix `BackdropFilter` all render inside Expo Go. Two Skia facts drive the structure:
- `Group layer` saves the layer **before** applying the group's own transform, so the blur must sit on an inner group nested inside the transform group for σ to scale with the marquee zoom as CSS does (`filter` is applied before `transform`).
- A `BackdropFilter` takes a single image filter; blur + saturate are composed imperatively (`MakeBlur(σ, σ, Clamp, MakeColorFilter(MakeMatrix(saturate), null))`) and passed through `<ImageFilter filter=…>`. Any prop can be a shared value; `layer` (an `SkPaint`) is rebuilt per frame in a derived value.

**RN above the canvas**, in this z-order: Mark → Blobs (+ scrim) → Bubble face → AuthPanel → ReplayPill. This matches the DOM order except that the mark is a sibling above the photo instead of a child of the stage; both fade within the same 0.3 s window (see §9).

## 5. State and timeline

### Component state (design: `state = { phase, step, email, pw, cf, eye, err }`)
- `phase: 'run' | 'photo' | 'bubble' | 'fade' | 'auth'` and `runId` (increments on REPLAY) in `useSplashTimeline`.
- Auth: `{ step: 'email' | 'pw' | 'confirm', email, pw, cf, eye, err }` in a `useReducer` inside `AuthPanel`, reset on `runId`.
- Store: unchanged — `splash: boolean`, `dismissSplash()`.

### Timeline (design: `run()`; `ACCEL = 3.0`, `T_PHOTO = 3000`, `T_BUBBLE = 3500`, `T_AUTH = 7100`)

| t | Event |
|---|---|
| 0 | `phase = 'run'`; marquee drive starts; auth/bubble state reset |
| 3000 ms | `phase = 'photo'` |
| 3500 ms | `phase = 'bubble'` |
| 6550 ms (`T_AUTH − 550`) | `phase = 'fade'` |
| 7100 ms | `phase = 'auth'` |

`run()` is called on mount and by REPLAY; it clears pending timers and the marquee restarts from `dist = 0`. On REPLAY every transition below retargets from its current value (CSS semantics), so the auth layer cross-fades out over 0.8 s while the marquee is already running (reference `splash-replay-0.3s.png`).

### Transitions (CSS `transition` → `withTiming` from the current value)

| Value | run | photo | bubble | fade | auth | duration / easing |
|---|---|---|---|---|---|---|
| `stageOp` (marquee + vignette) | 1 | 0 | 0 | 0 | 0 | .3 s ease |
| `markOp` | 1 | 0 | 0 | 0 | 0 | .45 s ease (inside the stage, so effectively gone at .3 s) |
| `photoOp` | 0 | 1 | 1 | 1 | 1 | .32 s ease |
| `photoScale` | 1.1 | 1 | 1.16 | 1.16 | 1.16 | 1.6 s cubic-bezier(.2,.8,.2,1) |
| `photoFx` (0 → `blur(11px) brightness(.6) saturate(.9)`) | 0 | 0 | 1 | 1 | 1 | .65 s ease |
| `veilOp` | 0 | 1 | 1 | 1 | 1 | .4 s ease |
| `blobOp` | 0 | 0 | 0 | 1 | 1 | .9 s ease |
| bubble mounted | – | – | yes | yes | – | pop keyframes on mount |
| `bubbleOp` (wrapper) | – | – | 1 (no transition: display none → flex) | 0 | – | .55 s ease |
| `authOp` / pointer events | 0 / none | 0 | 0 | 0 | 1 / auto | .8 s ease |

CSS `ease` = cubic-bezier(.25,.1,.25,1).

### Marquee kinematics (design: `tick`)
- `dt = min(0.05, frameDelta)`, `t` = seconds since the run started, `p = min(1, t / 3)`.
- `dist += (55 + 3200·p^2.8)·dt` (px). Speed goes 55 → 3255 px/s.
- Row `i` (0–5): `off = (dist·(0.8 + 0.1·i)) mod 1274`; even rows `translateX(−off)`, odd rows `translateX(off − 1274)`. `1274 = 7 × 182` (`182 = 168 tile + 14 gap`).
- Wrap: `rotate(−25deg) scale(1 + 0.16·p²)` about the screen centre; blur `σ = 16·max(0, (t − 1.5)/1.5)³` px in wrap-local units (so it scales with the zoom), applied only when `σ > 0.25`.
- The loop stops at `t ≥ 3.15 s` (`ACCEL + 0.15`).

### Auth logic (design: `next()`, `back()`, `renderVals()`)
- `emailOk = /\S+@\S+\.\S+/.test(email)`.
- `next`: email → `pw` when `emailOk`; pw → `confirm` (and `err = false`) when `pw.length ≥ 6`; confirm: when `cf.length ≥ 6`, `cf === pw` → `onDone()`, else `err = true`.
- `back`: confirm → pw with `cf = ''`, `err = false`; pw → email.
- `onCf` clears `err`; `onEmail`/`onPw` do not. `toggleEye` flips `eye` (shared by the password and confirm fields). Enter/submit → `next`.
- Arrow buttons shown when: email step & `emailOk`; `pw.length ≥ 6`; `cf.length ≥ 6`. `Go back` hidden on the email step. Error line shown when `err`.
- Google, Apple, and `Sign in` → `onDone()` directly.
- **Android back** (addition, in the spirit of the Slice 1 fix): on the `pw`/`confirm` steps the hardware back runs `back()` instead of leaving the app; on the email step, and outside `auth`, it is not handled.

## 6. Tokens (additions to `theme/tokens.ts`)

- Colours: `tileA '#111116'`, `tileB '#0C0C10'`, `tilePhoto '#0E0E12'`, `markInk '#08222E'`, `authBlueInk '#04222C'`, `authError '#FF8A94'`, `critical '#D0021B'` (= `red`), `warning '#E8A317'`. Whites are written inline as `rgba(255,255,255,a)` because the design uses fourteen different alphas.
- Fonts: `serif400 'InstrumentSerif_400Regular'`; `Txt.tsx` gains `Serif` (all weights map to 400).
- Easings: `css [0.25, 0.1, 0.25, 1]`, `inOut [0.42, 0, 0.58, 1]`, `bubble [0.2, 0.9, 0.25, 1]`; `standard` exists.
- Timeline constants live in `screens/splash/timeline.ts` (`T`, `MARQUEE`, `DUR`), next to the maths that uses them.

## 7. Fixtures (`fixtures/splash.ts`, verbatim)

- `TILES = ['tile-1', … 'tile-5']` → `require`d JPEGs; `GLYPHS` = the 12 `[icon, tone]` pairs (`alarm-warning-fill #D0021B`, `oil-fill #D0021B`, `temp-hot-fill #E8A317`, `battery-2-charge-fill #D0021B`, `steering-2-fill #E8A317`, `shield-flash-fill #D0021B`, `error-warning-fill #E8A317`, `drop-fill #E8A317`, `car-fill #D0021B`, `disc-line #E8A317`, `fire-fill #D0021B`, `lightbulb-flash-fill #E8A317`).
- `tile(k)`: `k % 3 === 1` → telltale `{ base: k % 2 ? '#111116' : '#0C0C10', glyph: GLYPHS[k % 12] }`; else photo `{ base: '#0E0E12', photo: TILES[k % 5] }`. Row `r` = tiles `k = r·4 + i`, `i = 0…6`, then the same seven again (14 per row).
- Copy: `RECALL HUB`, `REPLAY`, `Did you f*cking check?`, `Recall Hub`, `Get started with Recall Hub` (rendered as `Get started` ⏎ `with Recall Hub` — see §9), `Continue with`, `Google`, `Apple`, `OR`, `Email`, `Create your password`, `At least 6 characters. ` + email, `Password`, `One last step`, `Confirm your password to continue`, `Confirm password`, `Passwords do not match.`, `Go back`, `Already have an account? `, `Sign in`.

## 8. Components — measurements

Everything below is from the source's inline styles; DOM rects (430 × 932) from `splash-geometry.json` are quoted where they settle a question.

### Stage (Skia `<Canvas>`, window-sized, first child)
1. `Fill #08080A`.
2. **Marquee** — outer `Group` `transform=[{translateX: W/2},{translateY: H/2},{rotate: −25°},{scale}]` (origin = canvas origin, so the wrap centre lands on the screen centre); inner `Group layer={paint}` where `paint.imageFilter = MakeBlur(σ, σ, Decal)` and `paint.alpha = stageOp` (rebuilt per frame). Wrap local size `Wr = 2.4·max(W,H)` × `Hr = 6·112 + 5·14 = 742`, drawn centred on the origin (`x − Wr/2`, `y − Hr/2`). Row `i` at local `y = 126·i`; tile `j` (0–13) at local `x = tx_i + 182·j`.
   - Tile 168 × 112, radius 12. Shadow `0 18px 40px rgba(0,0,0,.55)` → a black `RoundedRect` at `+18 y`, opacity .55, `BlurMask blur={20}` (σ = 40/2). Photo tile: `RoundedRect` filled with `ImageShader fit="cover"`. Telltale tile: `RoundedRect` in `base`, glyph 40 px centred — em-box centring like the source's flex centring: `x = tileX + (168 − advance)/2`, baseline `y = tileY + 56 − (ascent + descent)/2` from `font.getMetrics()`; glyph string = `String.fromCodePoint(glyphMap[name])`, font = `useFont(remixicon.ttf, 40)`.
   - The source clips each row to the wrap width; the wrap is 2237 px wide centred, so that clip edge never enters the screen — not reproduced. The 14-tile track *does* leave a gap on the right of a row for part of each cycle (odd rows for `off < ~250`, even rows for `off > ~1024`); it sits under the vignette's darkest region and is reproduced as-is by using the identical formula.
3. **Vignette** — `Rect` over the canvas, `RadialGradient` centred, `rx = 1.18·W`, `ry = 0.76·H` (unit circle scaled), stops `rgba(8,8,10,0) 22%`, `rgba(8,8,10,.68) 64%`, `#08080A 100%`; `opacity = stageOp`. Drawn after the blur layer (not blurred).
4. **Photo** — `Group transform=[{scale: photoScale}] origin={centre}` → `Image crash-hero.jpg` at the cover rect (`px .5`, `py .4`), `opacity = photoOp`, children `Blur blur={11·fx} mode="clamp"` and `ColorMatrix` = brightness `1 − .4·fx` × saturate `1 − .1·fx` (standard luminance-weighted saturate matrix; brightness multiplies the RGB rows). Natural size 720 × 1542.
5. **Veil** — `Rect` with vertical `LinearGradient` `rgba(8,8,10,.30) 0%`, `rgba(8,8,10,.06) 40%`, `rgba(8,8,10,.66) 100%`, `opacity = veilOp`.
6. **BubbleBackdrop** (mounted while the bubble is) — `BackdropFilter` with `clip` = the bubble's rounded rect (`r 28`, bottom-left `9`) from the face's measured frame, `transform=[{translateY: pop.ty},{scale: pop.scale}]` about the frame centre, filter = `MakeBlur(16·s, 16·s, Clamp, MakeColorFilter(saturate(1 + 0.6·s)))` where `s = popOpacity × bubbleOp`. CSS fades a backdrop-filtered element by opacity; Skia cannot alpha a backdrop, so the effect strength follows the same curve instead (§9).

### Mark (RN; DOM: tile 54 × 54 at y 425.5, caption 13 px tall at y 493.5 → gap 14)
Centred column, `gap 14`, `opacity = stageOp × markOp`: tile 54 × 54, `r16`, `linear-gradient(150deg, #F4FBFF 0%, #A7DAFF 20%, #1B6E96 54%, #0E5378 76%, #8ACEFF 100%)` (`cssAngleToPoints(150, 54, 54)`), `shield-check-fill` 27 `#08222E` centred, `boxShadow 0 14px 34px rgba(0,0,0,.6)`; caption `Mono 10 / ls 2.8 rgba(255,255,255,.6)` `RECALL HUB`.

### Bubble (RN face + Skia backdrop; DOM: box 360.3 × 82 at (34.8, 425); text 304.3 wide, one line)
- Wrapper `absoluteFill`, `alignItems center`, `justifyContent center`, `paddingHorizontal 26`, `opacity = bubbleOp`, `pointerEvents none`.
- Face (`Animated.View`): `maxWidth 378` (= content 322 + padding 56, RN is border-box), `paddingVertical 24`, `paddingHorizontal 28`, `borderRadius 28`, `borderBottomLeftRadius 9`, outer `boxShadow 0 24px 60px rgba(0,0,0,.5)`; inner clip view (same radii, `overflow hidden`) containing: `LinearGradient −72deg` `rgba(255,255,255,.10) 0%`, `.22 45%`, `.08 100%`; an inset-shadow view `boxShadow: inset 0 1.5px 1px rgba(255,255,255,.42), inset 0 -2px 2px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.20)`; the highlight — `left 6%`, `right 34%`, `top 2`, `height 34%`, an SVG `Ellipse` filled with a vertical `LinearGradient rgba(255,255,255,.34) → 0`, wrapper `filter: [{ blur: 6 }]`.
- Copy: `Sans 29 / lh 34 / 600 / ls −0.7 #FFFFFF`, `textShadow 0 2px 10px rgba(0,0,0,.35)`, `textAlign center`. The source's `text-wrap: pretty` has no RN equivalent; at 430 the line is single (304 px in a 322 px content box) — see §15 for 412.
- Pop (`sp-bub`, .62 s, cubic-bezier(.2,.9,.25,1) per segment, on mount): opacity `0 → 1` by 58%; `translateY 20 → 0` by 58%; `scale .84 → 1.05` at 58% `→ 1` at 100%. Implemented with `withSequence(withTiming(58%), withTiming(42%))` on three shared values that also drive the Skia backdrop.
- Frame: the face reports `onLayout` (x, y, w, h relative to the full-screen wrapper) into a shared value; the face is mounted at `phase = bubble` and its layout is static, so the first `onLayout` is authoritative.

### Blobs (RN; the `blobOp` layer, DOM order 1–4 then scrim)
All: `borderRadius 50%` ellipse, `radial-gradient(circle, rgba(c, a) 0%, rgba(c, 0) 70%)` (circle radius = farthest corner), `filter: blur(σ)`, drift keyframes with `ease-in-out` per segment, infinite. Baked as PNGs at 1× with a 180 px bleed (§10) and drawn as `Animated.Image` at `(left − 180, top − 180)`, size `(w + 360) × (h + 360)`, transform about the box centre.

| # | w × h | CSS position | σ | colour, a | keyframes | period |
|---|---|---|---|---|---|---|
| 1 | 420 × 300 | `left −120`, `bottom 120` | 58 | `201,138,58`, .85 | `sp-blob1`: 50% `translate(−26, 22) scale(1.08)` | 20 s |
| 2 | 340 × 300 | `right −100`, `top 60` | 54 | `109,74,224`, .8 | `sp-blob2`: 50% `translate(24, −20) scale(1.06)` | 25 s |
| 3 | 300 × 280 | `right −70`, `bottom 60` | 60 | `142,27,42`, .8 | `sp-blob1` | 26 s |
| 4 | 300 × 240 | `left 40`, `top −60` | 56 | `27,110,150`, .75 | `sp-blob2` | 22 s |

Scrim above them: `rgba(8,8,10,.42)`. Whole layer `opacity = blobOp`, `pointerEvents none`.

### Auth panel (RN, `absoluteFill` column, `opacity = authOp`, pointer events only in `auth`)
- **Header** (DOM: tile at y 22): row centred, `gap 8`, `paddingTop 22 + insets.top`: tile 26 × 26 `r8 #0CB8E9` with `shield-check-fill` 15 `#04222C`; `Sans 15 / 600 / ls −0.2 #FFFFFF` `Recall Hub`.
- **Middle**: `flex 1`, `minHeight 0`, centred column, `gap 20`, `paddingHorizontal 24`, `paddingBottom 40`.
  - Email step block (`StepIn`, column centred, `gap 16`, `width 100%`): `Serif 52 / lh 52 / ls −1 #FFFFFF` centred `Get started` ⏎ `with Recall Hub` (DOM: 2 lines, 104 tall, balanced break); `Sans 13 / 500 rgba(255,255,255,.62)` `Continue with`; pill row `gap 12` — **GlassPill** `Google` (Google mark 19 × 19 SVG, paths verbatim) and `Apple` (`apple-fill` 19 white), each `h 42`, `paddingHorizontal 18`, `gap 8`, `r 999`, label `Sans 14 / 600 #FFFFFF` (DOM: 110.9 and 102.9 wide); OR row `width 100%`, `gap 10`, `paddingVertical 2` — lines `flex 1`, `h 1`, `rgba(255,255,255,.14)`; `Sans 11 / 600 / ls .4 rgba(255,255,255,.5)` `OR` (DOM row 18 tall at y 507).
  - Password step block (`gap 10`): `Serif 46 / lh 48 #FFFFFF` `Create your password` (one line, 335 wide); `Sans 13 / 500 rgba(255,255,255,.6)` `At least 6 characters. {email}`.
  - Confirm step block: `One last step`; `Confirm your password to continue`.
  - Fields column `gap 14`, `width 100%`, `maxWidth 320` (DOM: 320 × 52 at x 55):
    - **GlassField** (email; shown on email + pw steps): `h 52`, `paddingLeft 16`, `paddingRight 6`, `gap 8`, `r 999`; `mail-line` 18 `rgba(255,255,255,.72)`; `TextInput` `Sans 15 #FFFFFF`, placeholder `Email` `rgba(255,255,255,.45)`, `keyboardType email-address`, `autoCapitalize none`, `returnKeyType next`, submit → `next`; arrow button (when `emailOk`) 40 × 40 `r 999` with `arrow-right-line` 18 white, `accessibilityLabel Continue`.
    - Password field (pw step): `paddingLeft 12`; eye button 34 × 34 (`eye-line` / `eye-off-line` 18 `rgba(255,255,255,.72)`, label `Show password`); `TextInput` `secureTextEntry={!eye}`, placeholder `Password`; arrow when `pw.length ≥ 6`.
    - Confirm field (confirm step): same with placeholder `Confirm password`, arrow label `Finish`, arrow when `cf.length ≥ 6`.
    - Error `Sans 12.5 #FF8A94` centred `Passwords do not match.` when `err`.
    - Go back row (not on email): centred, `gap 7`: `arrow-left-line` 14 + `Sans 13`, both `rgba(255,255,255,.6)`.
- **Footer**: centred, `paddingHorizontal 24`, `paddingBottom 30 + insets.bottom`: `Sans 13 rgba(255,255,255,.55)` `Already have an account? ` + nested `Sans 13 / 500 #FFFFFF` `Sign in` → `onDone`.
- **Glass surfaces** (`GlassPill`, `GlassField`, arrow button): gradient `−72deg` via `cssAngleToPoints` sized by `onLayout`; pill fill `.06 / .16 45% / .05`, field fill `.05 / .14 45% / .04`, arrow fill `.10 / .24 45% / .08`; shadows — pill `inset 0 1px 1px rgba(255,255,255,.30), inset 0 -1.5px 1.5px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.14), 0 8px 18px rgba(0,0,0,.4)`; field `inset 0 1.5px 1px rgba(255,255,255,.26), inset 0 -1.5px 1.5px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.13), 0 10px 24px rgba(0,0,0,.4)`; arrow `inset 0 1px 1px rgba(255,255,255,.4), inset 0 0 0 1px rgba(255,255,255,.18)`. Pill pressed → `scale(.98)` (the source's hover). No backdrop blur (§9).
- **StepIn** (`sp-in`, .5 s ease, on mount, keyed by step): `opacity 0 → 1`, `translateY 10 → 0`, `filter blur 6 → 0` (Android; iOS ignores `blur`).

### Replay pill (RN; DOM: 83.3 × 30 at (332.7, 14) → right 14)
`position absolute`, `top 14 + insets.top`, `right 14`, row centred, `gap 6`, `height 30` (28 + 1 px border each side in the source's content-box), `paddingHorizontal 11`, `r 999`, `rgba(255,255,255,.10)`, `borderWidth 1 rgba(255,255,255,.16)`; `restart-line` 12 + `Mono 9 / ls 1.4`, both `rgba(255,255,255,.8)`. Tap → `run()`. Backdrop blur omitted (§9).

## 9. Effects — implementation and flags

| Effect | Implementation | Fidelity note |
|---|---|---|
| Marquee motion blur | Skia layer blur on the whole marquee, σ from the design's ramp, inside the zoom group | exact formula; one filter pass per frame |
| Marquee tiles, shadows, glyphs | Skia rounded rects, image shaders, mask-blurred shadow rects, TTF glyphs | exact; shadows use Skia's rrect blur fast path |
| Photo cut / blur / darken / zoom | Skia image with animated blur + colour matrix + scale | exact (filter before transform, as CSS) |
| Bubble backdrop `blur(16px) saturate(1.6)` | Skia `BackdropFilter` clipped to the face's rrect, same pop transform | **flag:** fades by filter strength, not by alpha (Skia cannot alpha a backdrop). Perceptually the same. |
| Bubble face, inset shadows, highlight | RN gradient + `boxShadow` insets + SVG ellipse under `filter: blur(6)` | highlight blur is Android-only (RN `filter` blur) |
| Auth pills / fields `backdrop-filter: blur(8px)` | gradient + inset shadows only | **flag:** the backdrop is already a σ 11 photo under σ 54–60 blobs, so an 8 px blur has no visible effect; omitted to avoid four full-screen BlurView snapshots per frame over animating blobs |
| REPLAY `backdrop-filter: blur(6px)` | omitted | **flag:** 28 px pill over the marquee; `expo-blur` cannot sample the Skia canvas |
| `saturate(1.6)` in the bubble backdrop | colour-matrix in the Skia filter | exact (Slice 1's "no saturate" limit was `expo-blur`'s) |
| Blobs | baked PNGs (gradient + ellipse + blur) drifting with Reanimated | exact geometry; blur baked once at 1× |
| Step entrance blur (`sp-in`) | RN `filter: blur` animated | Android only; iOS gets opacity + translate |
| Mark stacking | RN above the canvas (design: under the photo) | **flag:** during the 0.3 s cut the mark fades over, not under, the incoming photo — invisible in practice |
| `text-wrap: balance` / `pretty` | explicit line break in the display line; none for the bubble | matches the reference at 430 |
| Pill hover `scale(.98)` | pressed state | no hover on touch (as Slice 1) |
| Source first-run quirk | not reproduced | the source runtime attaches the row refs only after its first re-render, so on a fresh load the rows never scroll (only zoom + blur) until REPLAY. The port scrolls on every run — the coded intent (`tick`, README "accelerating diagonal marquee"). See §15. |

## 10. Assets, fonts, icons

- **Copied verbatim** into `src/assets/images/`: `tile-1…5.jpg` (336 × 224, tints and darkening pre-baked), `crash-hero.jpg` (720 × 1542). Already plate-redacted (see `WHERE-WE-LEFT-OFF.md`).
- **Baked** by `scripts/bake-assets.mjs` (pure Node + `pngjs`, extends the existing script): `blob-1…4.png` — for each blob a `(w + 360) × (h + 360)` canvas, alpha `a0·(1 − d/(0.7·R))` inside `d < 0.7·R` (`R` = farthest-corner radius), multiplied by the ellipse coverage, then the existing separable Gaussian with `σ` from the table. `npm run bake-assets` regenerates the Slice 1 assets too (idempotent).
- **Fonts:** `InstrumentSerif_400Regular` added to the root `useFonts`. Remixicon TTF is also loaded into Skia with `useFont(require('../assets/fonts/remixicon.ttf'), 40)` for the marquee glyphs (`getGlyphIDs`/`getGlyphWidths` for the advance, `getMetrics()` for the baseline).
- **Icons:** Remixicon names used: `shield-check-fill`, `apple-fill`, `mail-line`, `arrow-right-line`, `arrow-left-line`, `eye-line`, `eye-off-line`, `restart-line`, plus the 12 telltales — all present in the glyph map (checked).
- **Google mark:** the four `<path>`s from the source inside `<G transform="translate(3,2)">`, `viewBox 0 0 64 64`, 19 × 19.

## 11. Dependencies

Added with `npx expo install` (versions pinned to SDK 57 / Expo Go): `@shopify/react-native-skia@2.6.2`, `@expo-google-fonts/instrument-serif`. No other new dependency; no native build (Expo Go bundles Skia). Jest: the module is mocked wholesale in `jest.setup.ts` (components render as `View`s, hooks return `null`, `Skia.*` factories return inert objects), so no `canvaskit-wasm`.

## 12. Verification

1. **References** (done): `docs/reference/splash-{marquee-0s,marquee-1s,marquee-2s,marquee-2.6s,photo,bubble,fade,auth-email,auth-email-filled,auth-password,auth-password-filled,auth-password-eye,auth-confirm,auth-confirm-error,replay-0.3s}.png` + `splash-geometry.json`, regenerable with `node scripts/splash-refs.mjs`. The marquee frames were captured on a REPLAY run (transitions snapped off for the restart) because of the first-run quirk in §9.
2. **Emulator pass** on `s24ultraProxy`: capture `emu-splash-*.png` at the same moments (screencap latency ≈ 0.1 s; compare look, not tile positions) and every auth state; compare side by side at matched physical scale; frame-time sanity from `adb shell dumpsys gfxinfo host.exp.exponent` during the marquee (janky-frame percentage) — the emulator is not the frame-rate authority, the phone is.
3. **Tests:** `timeline.ts` (tile kinds/colours/glyph cycling, kinematics at t = 0 / 1.5 / 3, blur and scale ramps, row offsets and directions, cover rect, schedule); `auth.ts` (validators, step transitions, error set/clear, `done`); `AuthPanel` (arrow appears on a valid email, step headings, sub shows the email, mismatch error, match → `onDone`, Go back, Google/Apple/Sign in → `onDone`, eye toggles `secureTextEntry`); `Splash` with fake timers (mark + REPLAY at mount, bubble copy after 3.5 s, auth heading after 7.1 s, REPLAY returns to the mark); `Blobs`/`Bubble` render; `OverlayHost` mounts `Splash` when `splash` is true.
4. **On-device:** the S24 Ultra pass is appended to `verification.md` when the phone is at hand (with Slice 1's Task 23).

## 13. Risks

- **Skia layer blur cost at 120 Hz** — one full-screen offscreen layer + a σ ≤ 18.6 blur per frame for 1.5 s. Expected fine on a flagship; if the emulator shows drops, the fallback is to skip the layer while `σ < 0.25` (as the source does with `filter: none`).
- **Reanimated `filter` in animated styles** (StepIn blur, bubble highlight) — if Reanimated 4 does not forward `filter`, apply it as a static style and animate only opacity/translate; record in `verification.md`.
- **`onLayout` for the bubble frame** — measured relative to the full-screen wrapper; if edge-to-edge insets shift the canvas origin on some device, use `measureInWindow` instead.
- **Geist 600 metrics vs. web** — the bubble copy is 304 px in a 322 px box at 430 and exactly 304 px of room at 412 (§15).
- **Expo Go + Skia** — verified on the emulator; a "Cannot find native module" on the phone would mean an Expo Go version mismatch — update Expo Go from the Play Store.

## 14. Acceptance

Slice 2 is complete when: the app launches into the real Splash; the marquee accelerates, zooms and blurs into the crash-photo cut; the bubble pops in at 3.5 s and fades at 6.55 s; the auth screen fades in at 7.1 s over drifting blobs; email → password → confirm works with the arrow gating, error line, Go back and eye toggle; Google, Apple, Sign in, and a matching confirm all reach the Garage; REPLAY restarts the timeline with the cross-fade; every emulator capture matches its reference with the flags in §9 documented in `verification.md`; `npm test && npm run typecheck` pass.

## 15. Parked decisions (recorded, not asked)

1. **First-run marquee.** The source's first run never scrolls (runtime quirk); REPLAY scrolls. The port scrolls on every run. If the user prefers the exact first-run look (zoom + blur only), set the speed term to 0 for `runId === 0`.
2. **Bubble at 412 dp — resolved on the emulator (2026-09-10).** Available width `412 − 52 = 360` equals the bubble's width at 430 (`304 + 56`), and the copy measures just over the 304 dp content box, so it wraps at 411 dp. The source's own CSS would do the same: left-aligned (no `text-align` in the source — the port's `center` was removed) with `text-wrap: pretty` → `Did you` ⏎ `f*cking check?`. The port emulates `pretty` with a no-break space before "check?" (`PRETTY_COPY` in `Bubble.tsx`): one line where it fits (≥ 430 dp), that break where it does not. Overrule by trimming the bubble's side padding if a single line on the phone is preferred.
3. **Auth glass backdrop blur** omitted for frame rate (§9). If the user wants it, `expo-blur` `BlurView`s with `blurTarget` on a native wrapper of the blobs + a baked blurred photo would restore it at a cost of four snapshots per frame.
4. **Skia on iOS** — untested (no device); Skia is cross-platform, and the only Android-only bits are the two RN `filter: blur` uses.
