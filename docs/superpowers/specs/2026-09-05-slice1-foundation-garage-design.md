# Slice 1 — Foundation + Garage tab

**Date:** 2026-09-05
**Status:** approved design, awaiting spec review
**Source of truth:** `design_handoff_recall_hub/design/GaragePrototype.dc.html` (line numbers below refer to it). Where this spec and the source disagree, the source wins.

## 1. Purpose

Stand up the Expo / React Native port of the Recall Hub prototype and ship the first complete tab — Garage — pixel-faithfully, for a live demo on the user's Samsung S24 Ultra. Everything built here (theme, fixtures, store, primitives, tab bar, overlay host, verification loop) is the foundation the remaining five slices build on.

Fidelity is the primary requirement. Where a choice is between "what a conventional app would do" and "what the design does", do what the design does.

## 2. Scope

**In:**
- Expo project at the repo root; `design_handoff_recall_hub/` untouched.
- Theme tokens, typed fixtures, zustand store mirroring the design's state.
- Primitives: `MetalButton`, `GlowCard`, `DotPattern`, `HumpTabBar`, `Sheet`, `SlideUpScreen`, `Toast`, `HealthGauge`, `Icon`, plus small text/pill helpers.
- Five-tab shell with the hump tab bar. Garage is real; Recalls, Service, Hub, Profile render the design's own stub.
- Garage screen, Vehicle Stats screen, Add-vehicle sheet, VIN-help screen, Recall sheet, Toast.
- Splash **stub** honouring the real `onDone` contract.
- Asset-baking script (metal bezels, glow blob), font + icon loading.
- Reference-screenshot pipeline and Android emulator verification.
- Unit tests for derivations; component tests for the sheet and store flows.

**Out (later slices):** the real Splash/Auth (marquee, glass bubble, auth steps), Recalls, Service, Hub, Profile, concierge chat, recall detail screen, Skia, iOS verification, git.

## 3. Target platform and sizing

- **Device:** Samsung S24 Ultra — Android 14+, ~412 dp logical width, 120 Hz. All blurs, `filter`, and inset `boxShadow` are natively available (Android ≥ 12). iOS is secondary until an iPhone is available.
- **Sizing rule:** the design frame is 430 × 932 pt. All values in it are already dp and are used **as-is**; nothing is scaled. Layouts that assume the 430 width are re-expressed relative to `useWindowDimensions().width`:
  - Rail horizontal padding: `(width − 318) / 2` (design: 56 at 430).
  - Everything else uses fixed gutters (20) and flex, which already adapt.
- **Safe areas:** `react-native-safe-area-context`. Top inset above the Garage header; bottom inset painted `#FFFFFF` beneath the tab bar's white wrapper (the bar itself does not grow). Full-screen overlays and sheets respect insets the same way.
- **Frame chrome dropped:** the 30 px radius and `inset 0 0 0 1px rgba(0,0,0,.09)` frame border are design-canvas chrome, not app UI.

## 4. Architecture

```
C:\GARRS_Mobile\
  app/
    _layout.tsx               fonts, SafeAreaProvider, DotPattern, <Slot/>, OverlayHost, SplashStub
    (tabs)/
      _layout.tsx             expo-router <Tabs tabBar={HumpTabBar}>
      garage/
        _layout.tsx           Stack, screenOptions={{ headerShown:false, animation:'none' }}
        index.tsx             GarageScreen
        [id].tsx              VehicleStatsScreen
      recalls.tsx  service.tsx  hub.tsx  profile.tsx      TabStub
  src/
    theme/tokens.ts           colors, type roles, radii, easings, durations
    fixtures/                 vehicles.ts, decode.ts, tabs.ts, vinHelp.ts, recallSheet.ts
    store/useAppStore.ts      zustand
    lib/derive.ts             fleetLine, counter, statsFor, maskVin, vinOk, decodeVin
    ui/                       primitives (one file each)
    screens/                  GarageScreen, VehicleStatsScreen, VinHelpScreen, AddVehicleSheet,
                              RecallSheet, TabStub, SplashStub
    overlays/OverlayHost.tsx  renders sheet / vin-help / toast from the store
    assets/fonts/remixicon.ttf
    assets/images/            metal-blue.png, metal-mix.png, metal-default.png, glow-blob.png
  scripts/
    bake-assets.mjs           headless Chromium → PNGs above
    reference-shots.mjs       headless Chromium → docs/reference/*.png of the design
  docs/reference/             generated reference PNGs (gitignored later)
  design_handoff_recall_hub/  untouched
```

**Navigation.** expo-router. Tab switching is instant (no animation), like the design. The stats screen is a stack route inside the garage tab with `animation: 'none'` so it swaps in place exactly like the source (`isGarage` → `isStats`) while still getting the Android back gesture/button. Tapping any tab item runs the design's `onTap` — it also clears `sheet`, `screen`, and returns the garage stack to its root.

**Overlay host.** Sheets, the VIN-help screen, the toast, and the splash stub are rendered as absolutely-positioned siblings of the navigator in `app/_layout.tsx`, driven by the store — **never** via RN `<Modal>`. This matches the design's z-order (`sheet` z20, `vinhelp` z27, `toast` z30, splash z60) and sidesteps the Android blur-across-Modal bug.

## 5. State and data

### Store (`useAppStore`)

Field names are the design's, so screens can be checked against `renderVals()` (line 2284).

```ts
{
  tab: 'garage' | 'recalls' | 'service' | 'hub' | 'profile'   // mirrors router; set by HumpTabBar
  idx: number                     // active vehicle in the rail
  sheet: 'add' | 'recall' | null
  screen: 'vinhelp' | null        // 'stats' is a route, not store state
  scheduled: boolean
  toast: string | null
  vin: string
  splash: boolean                 // true until SplashStub's onDone
  vehicles: Vehicle[]
  // actions
  setTab, setIdx, openSheet, closeSheet, openVinHelp, closeVinHelp,
  setVin, addVehicle(), schedule(), flash(msg), dismissSplash()
}
```

- `flash(msg)`: sets `toast`, clears after **2200 ms**, cancelling any prior timer (line 1311).
- `addVehicle()` (line 1350): `raw = vin.trim().toUpperCase()`; `d = DECODE[raw] ?? { name:'New Vehicle', meta:'Decoded from VIN', health:90, range:'—' }`; pushes `{ id: Date.now(), ...d, vin: '···· ' + raw.slice(-6), sync:'SYNCED JUST NOW', recall:null, odo:8410, oilIn:4800, tireIn:2600, brakeIn:21000, regDays:240, psi:'40 / 40', battery:99 }`; closes the sheet; clears `vin`; sets `idx` to the new last index; `flash(d.name + ' added · monitoring for recalls')`.
- `schedule()`: `scheduled = true`; callers flash `'Service booked · Thu 10:30 AM'`.

### Fixtures (verbatim from source)

- `vehicles` — the three seed vehicles (line 1247).
- `DECODE`, `DEMO_VIN` (lines 1010–1014).
- `TABS` (line 1132).
- VIN-help `spots` (line 2312).
- Recall-sheet rows: `SEVERITY / Safety recall`, `REMEDY / Software update, free`, `DEALER / Tesla Service — 6.2 mi`, `EST. TIME / 45 minutes` (line 2259).

### Derivations (`lib/derive.ts`, pure, unit-tested)

- `fleetLine`: `${n} VEHICLE(S) · ` + (`${recallCount} RECALL` | `ALL CLEAR`); `recallCount = vehicles.filter(v => v.recall && !scheduled).length`.
- `counter`: `String(idx+1).padStart(2,'0') + ' / ' + String(n).padStart(2,'0')`.
- `vinOk(raw)`: `raw.length >= 11`.
- `statsFor(v, scheduled)` (line 1380): `CIRC = 2π·66`; `tone(n,warn,bad)` = `#D0021B` if `n<=bad`, `#c98a1f` if `n<=warn`, else `#01a08c`; `word` = Excellent ≥90 / Good ≥80 / Fair ≥65 / Needs work; `gaugeColor` = `#01a08c` ≥80 / `#0F638F` ≥65 / `#D0021B`; `metaUpper = meta.toUpperCase() + ' · VIN ' + vin`; `clearTitle`/`clearMeta`; `summary`; the four `tiles`; `service` rows with `due = 'in ' + in.toLocaleString('en-US') + ' mi'`, `pct = clamp(4, 100, round(100 − in/span·100))`, `meta = 'LAST DONE AT ' + last.toUpperCase()` where `last = (odo − (span − in)).toLocaleString('en-US') + ' mi'`. Spans: oil 6000 (warn 1500, bad 500), tire 6000 (1500, 500), brake 24000 (6000, 2000).

## 6. Tokens (`theme/tokens.ts`)

Taken from the README's Design tokens section and the source. Includes at minimum: the colour table; type roles (`display 38/42/600/−1.2`, `cardTitle 26/30/600/−0.6`, `statsTitle 24/28/600/−0.7`, `sheetTitle 22/600/−0.5`, `body 14/21`, `body13 13/19`, `monoL 11/2.6`, `monoM 10/1.8`, `monoS 9/1.2–1.4`); radii (8, 10, 12, 14, 16, 18, 20, 22, 999); easings `standard (.2,.8,.2,1)`, `hump (.2,.9,.2,1)`, `sheet (.2,.85,.2,1)`, `gauge (.43,.13,.23,.96)`, `press (.4,0,.2,1)`; durations 150, 200, 250, 280, 300, 340, 500, 550, 1400 ms. Font families: `Geist-Light/Regular/Medium/SemiBold`, `GeistMono-Regular/Medium`.

## 7. Primitives

### `Icon`
Remixicon 4.5.0 via `createIconSet(glyphMap, 'remixicon', 'remixicon.ttf')` from `@expo/vector-icons`, glyph map from `remixicon/fonts/remixicon.glyph.json`. Props: `name` (e.g. `'menu-2-line'`), `size`, `color`. Exact glyphs — no mapping to another set.

### `MetalButton` (`metalPill`, line 2131)
Props: `tint: 'blue' | 'mix' | 'default'`, `label`, `icon`, `iconSize=15`, `fontSize=13`, `gap=6`, `width=132`, `height=44`, `radius=100`, `flex`, `iconRight`, `onPress`.
Structure, bottom to top:
1. Wrapper `width × height`, `flex`; pressed → `translateY(1) scale(.98)`, 150 ms `press` easing.
2. Clip layer: `borderRadius: radius`, `overflow: hidden`, outer shadow tiers — idle `0 0 0 1px rgba(0,0,0,.3), 0 14px 10px rgba(0,0,0,.08), 0 3px 6px rgba(0,0,0,.16)`; pressed `0 0 0 1px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)` (RN `boxShadow` array; 150 ms).
3. **Bezel:** an `Image` of the pre-baked conic ramp (`metal-<tint>.png`, square, blur 1.5 px baked in), sized `spin = width·2.4` (320·2.4 when width is `'auto'`), centred, rotating 0→360° with `withRepeat(withTiming(360, { duration, easing: linear }))`. Duration **7 s idle, 2.33 s pressed** (hover state does not exist on touch). Direction: clockwise.
4. Face: `inset: 2`, `borderRadius: radius`, blue → `linear-gradient(160deg,#2E93C4 0%,#0F638F 55%,#0B4E73 100%)`, else `linear-gradient(180deg,#202020,#000)`; pressed adds `inset 0 2px 4px rgba(0,0,0,.4)`.
5. Label row: icon + text, colour `#EAF7FF` (blue) / `#8A8F94` (other), `textShadow 0 1px 2px rgba(0,0,0,.5)`; `flexDirection: row-reverse` when `iconRight`.
6. Ripple: on press-in at the touch point, a 20 px radial-gradient circle (`rgba(255,255,255,.45) → 0 at 70%`) scaling 0→4 and fading .5→0 over 600 ms ease-out, clipped to the radius.

Ramps: `TINT` `#6F8EA3,#D6EAF6,#243642,#A8C6D8,#101B24,#E8F6FF,#3E5B6B,#8FB2C6`; `TINT_BLUE` `#1B6E96,#8ACEFF,#E8F6FF,#B8E2FF,#0E5378,#F4FBFF,#4E9DC4,#A7DAFF`; `TINT_MIX` `#8A8A8A,#EDEDED,#2B2B2B,#8ACEFF,#141414,#E8F6FF,#3E5B6B,#A6A6A6`. Each conic is `from 0deg, ramp..., ramp[0]`.

### `GlowCard` (vehicle card line 65, stats recall card line 287)
Props: `shell` colour, `radius` (18 | 20), `glow: boolean`, `blob` (`size`, `blur`), `faceOpacity` (.82 | .84), `faceRadius` (16 | 18), `facePadding`, `outline` (`rgba(0,0,0,0.09)` | `.08`), children.
- Shell: `background: shell`, `borderRadius: radius`, `overflow: hidden`.
- Blob (when `glow`): `glow-blob.png` (pre-baked: circle, `linear-gradient(90deg,#ec4899,#ef4444,#eab308)`, blurred; baked at 210 px and scaled to `size`), centred at 50%/50%, translated along the `blob3` path — `(−100%,−100%) → (0,−100%) → (0,0) → (−100%,0) → back`, 5 s linear, infinite. Percentages are of the blob's own size.
- Face: `margin: 2`, `borderRadius: faceRadius`, `rgba(255,255,255,faceOpacity)`, 1 px inset outline. When `glow`, an `expo-blur` `BlurView` (intensity ≈ 40, tint light) sits between blob and face fill. When not `glow`, no BlurView — the blur is imperceptible over a flat shell.

### `DotPattern` (`dots()`, line 2182)
`react-native-svg` `<Pattern>` 16×16, `<Circle cx=1 cy=1 r=1>`, fill `rgba(120,120,120,0.48)`, full-bleed `<Rect>`. Two nested `MaskedView`s so both fades apply: the outer mask is a vertical `LinearGradient` `transparent 0 → #000 10% → #000 90% → transparent 100%`; its content is an inner `MaskedView` whose mask is a horizontal `LinearGradient` `transparent 0 → #000 14% → #000 86% → transparent 100%` and whose content is the SVG dots.

**Blur intensities.** `expo-blur`'s `intensity` has no formula from CSS px. Starting values: 40 for the 24 px card faces, 8 for the 2 px scrim. These are tuned once on the emulator against the reference PNGs and then fixed as tokens.

### `HumpTabBar` (lines 720–737)
- White wrapper (`#FFFFFF`) → dark wrapper `#17181A`, `paddingBottom: 6`, radius `11 11 28 28` → menu row `paddingHorizontal: 8`, `#17181A`, radius `11 11 0 0`, `flexDirection: row`.
- Items: `flex: 1`, `height: 28`; active → `translateY(−6)`; inactive → 0; 550 ms `hump` easing. Inside: a 28 px white circle (`scale` 1 active / 0 inactive, 550 ms) and the icon (15 px, 18 px box) — colour `#17181A` active / `#FFFFFF` inactive, opacity 1 / .62, 300 ms.
- Hump: 61 × 13.7, positioned `bottom: 100% − 1px` relative to the menu row, `translateX(humpX)` at 550 ms `hump` easing. Drawn with `react-native-svg` `<Path>` fill `#17181A`, `viewBox="0 0 202.9 45.5"`, `preserveAspectRatio="none"`, path:
  `M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z`
- `humpX = itemLeft − (61 − itemWidth) / 2`, from each item's `onLayout` relative to the menu row (source `placeHump`, line 1277).
- Icons: `TABS` `on`/`off` names. Tapping runs the store's tab switch (clears `sheet`, `screen`, pops garage stack to root) and navigates.

### `Sheet` (`sheetShell`, line 2203)
Absolute overlay (z20), column, `justifyContent: flex-end`. Scrim `rgba(23,22,26,0.28)` + `BlurView` intensity ≈ 8 (the source's `blur(2px)`), fade-in 200 ms, tap → `closeSheet`. Panel: `#FFFFFF`, radius `22 22 0 0`, `boxShadow 0 −8px 40px rgba(0,0,0,.18)`, `padding 10 20 28`, slides `translateY(100%) → 0` over 280 ms `standard`. Handle 36 × 4, r2, `#dcdbd8`, `marginBottom: 18`. Header: title `22/600/−0.5 #17161A`; sub mono `10 / 1.6 #57565e`, `marginTop: 6`; optional `action` node right-aligned. Bottom safe inset added inside the panel.

### `SlideUpScreen` (VIN help, line 849)
Absolute overlay (z27), `#FFFFFF`, column, slides `translateY(100%) → 0` over 340 ms `sheet` easing. Header `padding 18 20 8`, `gap 12`: close button 38 × 38, `marginLeft −9`, r19, `close-line` 23 `#17161A`; mono caption `10 / 1.8 #57565e`. Body: scroll. Optional pinned footer.

### `Toast` (line 2277)
Absolute `left 20 right 20 bottom 104` (above the bar; add bottom inset), z30, row `gap 10`, `padding 13 15`, r12, `#17161A`, text `#F4F3F5 13`, `checkbox-circle-line` 16, fade-in 200 ms, `boxShadow 0 8px 24px rgba(0,0,0,.2)`.

### `HealthGauge` (lines 321–330)
Box `height 196`, centred. `react-native-svg` 164 × 164 rotated −90°: track `<Circle r=66 strokeWidth=10 stroke=#dcdbd8 strokeDasharray="7 10" strokeLinecap=round>`; progress `<Circle r=66 strokeWidth=10 stroke=gaugeColor strokeLinecap=round strokeDasharray=CIRC strokeDashoffset=animated>`. On mount: dashoffset animates `CIRC → CIRC − health/100·CIRC` over 1400 ms `gauge` easing (`AnimatedProps`). Centre column: count `48/50/600/−2 #17161A`, word `16/500 #6b6a72`. Count-up: `round(target · (1 − (1−p)³))`, p over 1400 ms (source uses a 32 ms interval; use `withTiming` + `useDerivedValue` → `Math.round`).

## 8. Screens

Every measurement below is from the source; anything not listed is read from the cited line.

### Garage (`isGarage`, lines 41–125)
Scroll view, column `gap 26`, `paddingBottom 24`.
1. Header row `minHeight 56`, `paddingHorizontal 20`: 36 × 36 box (`marginLeft −8`) `menu-2-line` 20 `#6b6a72`; centre mono `11 / 2.6 #6b6a72` `RECALL HUB`; 36 × 36 (`marginRight −8`) `notification-3-line` 19 `#6b6a72` with a 6 px `#D0021B` dot at `right 6 top 7`.
2. Title row `paddingHorizontal 20`, `alignItems flex-end`, `gap 16`: `Garage` display; `fleetLine` mono `11 / 1.4 #63626a`; `MetalButton` blue `Add Vehicle` / `sparkling-2-line` → `openSheet('add')`.
3. Section `gap 14`: label row `paddingHorizontal 20` — `YOUR VEHICLES` / `counter`, mono `10 / 1.8 #63626a`.
4. **Rail:** horizontal `FlatList`, `gap 14`, `contentContainerStyle.paddingHorizontal = (width − 318)/2`, `snapToInterval = 332`, `snapToAlignment: 'center'`, `decelerationRate: 'fast'`, `showsHorizontalScrollIndicator: false`. Data is the vehicle list **tripled** (`[0,1,2].flatMap`), initial offset centred on the middle copy; on scroll end, if the index lands in the first/last copy, jump silently by one set (source `onRailScroll`, line 1330). Programmatic `scrollTo(i)` targets the middle copy, animated (source glide: 420 ms ease-out cubic). Non-active cards `opacity .55` (250 ms). Edge fade: `MaskedView` with horizontal gradient `transparent 0 → #000 9% → #000 91% → transparent 100%`.
   - **Vehicle card** (`GlowCard` shell `#F2F1EE` r18, `glow = recall && !scheduled`, blob 190/blur 14, face .82 r16 padding `18 18 0`):
     - row: `sync` mono `10 / 1.4 #6b6a72` | `more-fill` 18 `#63626a`
     - `marginTop 26`, `gap 4`: name cardTitle; meta `14 #6b6a72`
     - `marginTop 22`, row `gap 10`: `HEALTH` mono `10 / 1.2 #63626a`; track `flex 1, height 3, r2, rgba(0,0,0,.09)`; fill width `health%` — open recall → `linear-gradient(90deg,#ffb741,#D0021B)`, else `#01a08c`; value mono `11 #17161A`
     - `marginTop 20`: badge pill r999, `border 1 rgba(0,0,0,.14)`, `rgba(0,0,0,.02)`, `padding 6 10`, `gap 10`: [icon 15 — open `close-circle-fill #D0021B` / `checkbox-circle-fill #01a08c` + `12/500 #17161A` `Recall open` | `No recalls`] · divider 1 × 14 `rgba(0,0,0,.13)` · [`shield-check-line` 15 + `12 #6b6a72` `Fix available` | `Monitored`]
     - footer `margin 22 −18 0`, `padding 14 18`, `#EDECE8`, `borderTop 1 rgba(0,0,0,.07)`: [`RANGE` mono `9 / 1.2 #57565e` over `13 #3a3941`] `gap 18` [`VIN` over mono `12 #3a3941`]; action pill r999 `12/500 padding 8 14 gap 6` + `arrow-right-up-line` 14 — open → `#D0021B` / `#fff` `Review recall`; else `rgba(0,0,0,.05)` / `#17161A` `Open`.
     - Taps: card → if not active `scrollTo(i)`, else open stats; action pill → open recall sheet if open recall, else open stats.
5. Pager `paddingHorizontal 20`, row `gap 6`: per vehicle a 2 px-tall r1 bar — active `width 22`, colour `#D0021B` if it has a recall else `#17161A`; inactive `width 6 #dcdbd8`; 250 ms. Tap → `scrollTo(i)`.
6. Needs attention `paddingHorizontal 20`, `gap 10`: label `NEEDS ATTENTION` mono `10 / 1.8 #63626a`; per open recall an alert row `gap 12 padding 14 16 r14 #F2F1EE`: `error-warning-line` 18 `#D0021B`; title `14/500 #17161A`; meta mono `10 / 1 #57565e` = `code · NAME`; `arrow-right-s-line` 20 `#63626a`; tap → recall sheet. If none: row `gap 10 padding 14 16 r14 #F2F1EE`: `checkbox-circle-fill` 18 `#01a08c` + `14 #3a3941` `Nothing outstanding across your fleet.`

### Vehicle Stats (`isStats`, lines 275–361; `statsFor`, line 1380)
Route `garage/[id]`. Scroll `padding 18 20 28`, `gap 22`.
1. Back row `gap 12`: 36 × 36 (`marginLeft −8`, r18) `arrow-left-line` 20 `#17161A` → back; name statsTitle; `metaUpper` mono `10 / 1.4 #57565e`.
2. If open recall — `GlowCard` shell `#232228` r20, blob 210/blur 16, face .84 r18 padding 18 `gap 14`: chip `#D0021B`/`#fff` mono `9 / 1.4 padding 5 10` + `alarm-warning-fill` 12 `ACTIVE SAFETY RECALL` · code mono `10 / 1.2 #57565e`; title `21/25/600/−0.5`; sub `13 #6b6a72` `Free remedy available · 45 min at Tesla Service, 6.2 mi away`; row `gap 10`: `MetalButton` blue `Schedule Repair` / `calendar-2-line`, `flex 1.4`, width auto, h50, r999, gap 8, icon 16, font 14 → `schedule()` + flash; `Details` outlined `flex 1 h50 r999 border 1 rgba(0,0,0,.14) 14/500` + `arrow-right-up-line` 15 → switch to Recalls tab (stub in this slice).
   Else — row `gap 11 r16 #F2F1EE padding 15 16`: `shield-check-fill` 19 `#01a08c`; `clearTitle 14/500`; `CHECKED AGAINST NHTSA · {clearMeta}` mono `9 / 1.2 #57565e`.
3. Health card r20 `#F2F1EE` `padding 22 22 26` `gap 6`: row `Vehicle health 17/500 #6b6a72` + 40 px circle `gaugeColor` with `pulse-line` 19 white; `HealthGauge`; summary `13 #6b6a72` centred.
4. Tiles: 2-column grid `gap 10`, each r14 `#F2F1EE padding 14 15 gap 7`: [icon 15 `tone` + label mono `9 / 1.3 #57565e`]; value `20/600/−0.5 #17161A`; note `12 #6b6a72`. Icons: `dashboard-3-line`, `oil-line`, `loader-2-line`, `battery-charge-line`.
5. `MAINTENANCE` label + rows r14 `#F2F1EE padding 14 15 gap 9`: label `14/500` | due mono `11` in `tone`; bar 3 px track/fill (`pct`, 800 ms); meta mono `9 / 1.2 #57565e`.
Gauge and count-up start on mount.

### Add-vehicle sheet (`addSheet`, line 2217)
`Sheet` title `Add a vehicle`, sub `ENTER VIN · 17 CHARACTERS`, action = info button 36 × 36 r10 `border 1 rgba(0,0,0,.14)` `#FFFFFF` `information-line` 18 `#3a3941` → `openVinHelp()`.
Body column `gap 14`, `marginTop 20`:
- `TextInput` mono `15 / 1.2 #17161A`, `padding 15 16`, r12, `border 1 rgba(0,0,0,.14)`, `#F7F6F4`, placeholder `1FTVW1EL5NWG00001`, `autoFocus`, `autoCapitalize: 'characters'`, `autoCorrect: false`, submit → `addVehicle()` when ok.
- Chips row `gap 8`, each `12 #3a3941 padding 8 12 r999 border 1 rgba(0,0,0,.14)`: `Use sample VIN` (`file-list-3-line` 14) → `setVin(DEMO_VIN)`; `Scan` (`camera-line`) → `flash('Camera scan is not wired up in this prototype')`.
- Decoded preview when `DECODE[raw]` exists: row `gap 10 padding 12 14 r12 #F2F1EE`, fade-in 200 ms: `checkbox-circle-fill` 17 `#01a08c`; name `14/500`; meta `12 #6b6a72`.
- CTA `Add to garage`: `marginTop 4`, centred, `paddingVertical 15`, r999, `14/500`; ok → `#17161A` / `#fff`; not ok → `#E7E6E3` / `#9a99a2` (200 ms). Tap: ok → `addVehicle()`; else `flash('Enter a VIN first')`.
Keyboard: sheet content avoids the keyboard (`KeyboardAvoidingView`), scrim stays.

### VIN help (`isVinHelp`, lines 848–895)
`SlideUpScreen` caption `FINDING YOUR VIN`. Body scroll `gap 20 padding 8 20 32`:
1. `gap 7`: `Where to find your VIN` `30/35/600/−1.1`; body `14/21 #6b6a72` (line 858 copy).
2. Spots `gap 10`, each r16 `#F2F1EE padding 16 gap 13`: 38 px white circle with icon 19 `#0F638F`; title `15/600/−0.2` + tag mono `9 / 1.2 #57565e` (baseline, `gap 8`); body `13/19 #6b6a72`.
3. `WHAT IT LOOKS LIKE` label; dark card r16 `#17161A padding 18 16 gap 9`: `1FTVW1EL5NWG00001` mono `17 / 2.4 #F4F3F5`; `17 CHARACTERS · NO I, O OR Q` mono `9 / 1.3 rgba(255,255,255,.45)`; note `13/19 #6b6a72` (line 882 copy).
4. Info row r14 `#F2F1EE padding 14 15 gap 10`: `information-line` 17 `#0F638F` + `13/19 #3a3941` (line 887 copy).
Footer `padding 12 20 18`, `borderTop 1 rgba(0,0,0,.07)`, `gap 10`: `Enter manually` (`keyboard-line` 17) h52 r999 `#17161A`/`#F4F3F5` `15/500` → close + `openSheet('add')`; `Scan` (`camera-line`) outlined `border 1 rgba(0,0,0,.14) #17161A` → same + flash scan message.

### Recall sheet (`recallSheet`, line 2250)
Vehicle = first with a recall. `Sheet` title `recall.title`, sub `code · NAME`. Body `marginTop 18`: four rows `padding 11 0`, `borderBottom 1 rgba(0,0,0,.07)`: key mono `10 / 1.2 #57565e` | value `13 #17161A`. Then row `gap 10 marginTop 20`: `MetalButton` blue label `Scheduled` if `scheduled` else `Schedule Repair`, `calendar-2-line`, `flex 1.5`, width auto, h54, r16, gap 9, icon 17, font 15 → `schedule()`, close, flash; `Details` outlined `flex 1 h54 r999 border 1 rgba(0,0,0,.14) 14/500` + `arrow-right-up-line` 15 → close, switch to Recalls tab, `flash(code + ' · opening recall detail')`.

### Tab stub (`isStub`, lines 712–718)
Centred column `gap 12`, `padding 0 40 56`: tab's `off` icon 26 `#9a99a2`; title (`Recalls` etc.) `22/600/−0.4 #17161A`; `NOT IN THIS PROTOTYPE YET` mono `10 / 1.6 #63626a` centred.

### Splash stub
Full-bleed `#08080A` overlay (z60) while `splash`. Centre: a 54 × 54 r16 logo tile built from the same layers as `MetalButton` (rotating `metal-blue.png` bezel, face `inset 2` with the dark gradient, `shield-check-fill` 24 `#EAF7FF` centred) + `RECALL HUB` mono `10 / 2.4 rgba(255,255,255,.7)` caption 14 px below; bottom: `TAP ANYWHERE TO CONTINUE` mono `10 / 1.6 rgba(255,255,255,.5)`. Tap → `dismissSplash()`. Exposes the same `onDone` prop shape as the real Splash so slice 6 swaps it in place.

## 9. Effects — implementation and flags

| Effect | Implementation | Fidelity note |
|---|---|---|
| Metal bezel | pre-baked conic PNG rotated by Reanimated | exact pixels; only rotation is live |
| Glow blob | pre-baked blurred PNG translated on the `blob3` path | baked once at 210 px / blur 16 (the stats card's values) and scaled to 190 for the vehicle card, whose source blur is 14 — a ~0.5 px difference, accepted |
| Glass face over blob | `expo-blur` between blob and 82/84% white | `saturate` not used here |
| Flat faces | plain fill | indistinguishable at 82% white |
| Scrim `blur(2px)` | `BlurView` low intensity | subtle; visible on the emulator only if you look |
| Outer/inset shadows | RN `boxShadow` (New Architecture) | native on Android 14 |
| Tab bar hump | `react-native-svg` path + Reanimated `translateX` | exact |
| Rail edge fade | `MaskedView` + gradient | exact |
| Gauge | `react-native-svg` + `AnimatedProps` | exact |
| Rail flick | `FlatList` snapping | **flag:** platform deceleration, not the source's 420 ms cubic; centring, dimming and infinite wrap match |
| Metal hover speed-up | n/a | **flag:** no hover on touch; idle and pressed speeds only |

## 10. Assets, fonts, icons

- **`scripts/bake-assets.mjs`** (dev dependency `playwright`): renders each conic ramp with the design's exact CSS (`conic-gradient(from 0deg, …)`, `filter: blur(1.5px)`) at 768 × 768 @1x onto a transparent background and writes `metal-blue.png`, `metal-mix.png`, `metal-default.png`; renders the glow blob (`210 × 210`, `linear-gradient(90deg,#ec4899,#ef4444,#eab308)`, `filter: blur(16px)`, `borderRadius: 50%`, on transparent with 48 px bleed) as `glow-blob.png`. Re-runnable via `npm run bake-assets`. Playwright downloads Chromium on first install (~150 MB); alternatively the session's Playwright MCP can run the same page.
- **`scripts/reference-shots.mjs`**: opens `GaragePrototype.dc.html` in headless Chromium at 430 × 932, dismisses the splash (tap the OAuth pill), and screenshots: garage idle, garage with card 2 active, stats (Model S, open recall), stats (Taycan), add sheet empty, add sheet with sample VIN, VIN help, recall sheet, each non-garage stub. Output `docs/reference/*.png`.
- **Fonts:** `@expo-google-fonts/geist` (300/400/500/600), `@expo-google-fonts/geist-mono` (400/500) via `useFonts`; Instrument Serif deferred to slice 6.
- **Icons:** `remixicon` npm package → copy `fonts/remixicon.ttf` and `fonts/remixicon.glyph.json` into `src/assets`, load with `expo-font`, wrap with `createIconSet`.

## 11. Dependencies

`create-expo-app@4` default (Expo SDK 57, expo-router, TypeScript). Add via `npx expo install`: `expo-blur`, `expo-font`, `expo-linear-gradient`, `react-native-svg`, `@react-native-masked-view/masked-view`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@expo/vector-icons`, `@expo-google-fonts/geist`, `@expo-google-fonts/geist-mono`. Plain: `zustand@5`, `remixicon@4.5.0`. Dev: `playwright`, `jest-expo`, `@testing-library/react-native`. Package manager: npm. `expo-glass-effect` and Skia are **not** added in this slice.

## 12. Verification

1. **Environment:** set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk`, add `platform-tools` and `emulator` to PATH, create an AVD named `s24proxy` (device profile **Pixel 8** — 411 dp wide, matching the S24 Ultra; *not* Pixel 8 Pro, which is 448 dp) on the **`system-images;android-35;google_apis_playstore;arm64-v8a`** image. **The development PC is an ARM64 Windows machine (Snapdragon X)** — x86_64 images cannot run on it (no acceleration path; the emulator exits with "x86_64 emulation currently requires hardware acceleration"), so the ARM64 image must be downloaded (~2 GB; the user approved this on 2026-09-05). A hypervisor is present, so the ARM64 image accelerates via Windows Hypervisor Platform. The SDK has no `cmdline-tools`, so the AVD is created in Android Studio's Device Manager, or `avdmanager` after installing "Android SDK Command-line Tools" from the SDK Manager.
2. **Reference PNGs** generated first, before any screen is built.
3. **Per screen:** run in Expo Go on the emulator, capture `adb exec-out screencap -p`, compare side by side with the reference at the same logical width. A screen is done when spacing, type, colours, and states match; differences are either fixed or written up as a flag in this spec's table.
4. **Tests:** Jest — `derive.ts` (fleetLine, counter, vinOk, statsFor tones/words/gauge/service rows against the seed vehicles), store actions (`addVehicle` decode + fallback, `flash` timing, `schedule`). RNTL — add sheet enables/disables the CTA on VIN length, decoded preview appears for `DEMO_VIN`, recall sheet label flips after scheduling, tab switch closes an open sheet.
5. **On-device:** final pass on the S24 Ultra via Expo Go before the slice is called complete.

## 13. Risks

- **`boxShadow` with multiple layers + `overflow: hidden` on the same view** — RN clips shadows inside overflow-hidden parents; the metal button nests the shadowed clip layer inside an unclipped wrapper to avoid this. Verify early.
- **BlurView inside a `FlatList` cell that animates opacity** — measure on the emulator; if it stutters, restrict the BlurView to the active card only.
- **Reanimated rotation of a large image at 120 Hz** — one bezel per visible button; expected fine. If not, reduce baked size.
- **Geist metrics vs. web** — line heights are set explicitly everywhere, so font-metric differences are contained to glyph shapes.

## 14. Acceptance

Slice 1 is complete when: all five tabs are reachable with the hump animating correctly; Garage, Stats, Add sheet, VIN help, Recall sheet and Toast match their reference PNGs on the emulator with every flag documented; adding the sample VIN appends the F-150 Lightning and scrolls to it; scheduling from either the recall sheet or the stats screen flips the card, alert list, and stats to the scheduled state; tests pass; the app runs in Expo Go on the S24 Ultra.
