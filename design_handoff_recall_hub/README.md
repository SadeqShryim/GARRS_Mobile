# Handoff: Recall Hub — mobile app (splash → auth → 5-tab app)

## Overview

Recall Hub is a mobile app for vehicle owners: it watches open safety recalls against the VINs you add, explains dashboard warning lights, and books the repair. This package contains the approved design for the full demo flow:

1. **Splash** — an accelerating diagonal marquee of accident photos and dashboard telltales that motion-blurs, cuts to a crash photo, blurs it, and pops a liquid-glass speech bubble reading "Did you f*cking check?"
2. **Auth** — dark glass sign-up/sign-in over animated color blobs, three progressive steps (email → password → confirm).
3. **The app** — five tabs: Garage, Recalls, Service, Hub, Profile.

**Target runtime: Expo (React Native), runnable in Expo Go.** See "Porting notes for Expo" — several effects need platform substitutes.

## About the design files

The files in `design/` are **design references authored in HTML**, not production code to copy. They run in a small in-house component runtime (`support.js`): a `.dc.html` file holds a template (HTML with `{{ }}` value holes, `<sc-for>` loops, `<sc-if>` conditionals) plus a logic class (`class Component extends DCLogic`) with React class-component semantics — `state`, `setState`, `componentDidMount` — whose `renderVals()` returns the values the template interpolates.

Two things make this easy to port:

- **All styling is inline `style="…"`, no stylesheets and no CSS classes.** Those compile to React style objects, so the values transfer almost verbatim to React Native `StyleSheet` objects (with the caveats listed below).
- **The logic class is already React.** `state` / `setState` map directly to `useState` or a class component.

Translation table:

| Design file | React Native |
|---|---|
| `{{ x }}` | `{x}` |
| `<sc-for list="{{ items }}" as="item">` | `items.map(item => …)` |
| `<sc-if value="{{ cond }}">` | `cond && …` |
| `<dc-import name="Splash" on-done="{{ fn }}">` | `<Splash onDone={fn} />` |
| `<i class="ri-car-fill">` | `<Icon name="…" />` (see Assets) |
| `renderVals()` return values | derived values + handlers in the component body |
| `style="display:flex;flex-direction:column"` | `{ flexDirection: 'column' }` (flex is the RN default) |

**Read the HTML directly for any measurement this README doesn't give.** Because everything is inline-styled, `design/GaragePrototype.dc.html` is the authoritative source for every value — open it and search for the copy string of the element you're building.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, copy, and interaction timings. Recreate pixel-faithfully. Do not redesign, re-space, or "improve" layouts. Where a native platform cannot reproduce an effect exactly (motion blur, chrome gradients), match the *intent* and flag it rather than substituting a different look.

The design frame is **430 × 932 px** (iPhone 16 Pro Max logical size), white background, 30px corner radius, `overflow: hidden`. In the app that frame becomes the device screen: drop the fixed width/height and the radius, and use `SafeAreaView`. All internal measurements are in that 430pt-wide space — they are already device-independent points, so use them as-is.

---

## Screens / views

### 1. Splash (`design/Splash.dc.html`)

Full-bleed, background `#08080A`. Runs a fixed 7.1-second timeline on mount, then reveals the auth screen. State machine: `phase: 'run' | 'photo' | 'bubble' | 'fade' | 'auth'`.

**Timeline (authoritative):**

| t | Event |
|---|---|
| 0 s | Marquee starts. Logo mark (54×54 chrome tile + `RECALL HUB` mono caption) is centered and fades in. |
| 0 → 3.0 s | Rows accelerate continuously. Velocity in px/s = `55 + 3200 · p^2.8` where `p = min(1, t/3.0)`. Integrate per frame (`dist += vel · dt`, clamp `dt` to 50 ms). |
| 1.5 → 3.0 s | Motion blur ramps on the whole marquee: `blur = 16 · max(0,(t-1.5)/1.5)^3` px. Marquee also scales `1 → 1.16` (`1 + 0.16·p²`). |
| 3.0 s | Cut: marquee fades out (0.3 s), crash photo fades in **sharp** (0.32 s) at `scale(1)` from `scale(1.1)`, plus a top/bottom dark veil. |
| 3.5 s | Crash photo blurs to `blur(11px) brightness(.6) saturate(.9)` over 0.65 s and drifts to `scale(1.16)`; glass bubble pops in. |
| 3.5 → 6.55 s | Bubble holds ~3 s. |
| 6.55 s | Bubble fades out (0.55 s); color blobs fade in (0.9 s). |
| 7.1 s | Auth screen fades in (0.8 s), pointer events enabled. |

A `REPLAY` pill sits at top-right (28px tall, `rgba(255,255,255,.10)` fill, 1px `rgba(255,255,255,.16)` border, 9px Geist Mono `REPLAY` + `ri-restart-line`) — it exists for demoing and can be dropped in production.

**Marquee construction:** 6 rows inside a container rotated **−25°**, width `240vmax`, centered via `top/left: 50%` + `translate(-50%,-50%)`, `flex-direction: column`, `gap: 14px`. Each row is a horizontal flex track, `gap: 14px`, holding its 7 tiles **duplicated once** (14 children) so it can wrap seamlessly: offset `= (dist · (0.8 + 0.1·rowIndex)) % (7 · 182)`, applied as `translateX(-offset)` on even rows and `translateX(offset - 1274)` on odd rows (alternating direction). `182 = 168 tile + 14 gap`.

Tiles are **168 × 112**, `borderRadius: 12`, `boxShadow: 0 18px 40px rgba(0,0,0,.55)`. Two kinds, interleaved by `index % 3 === 1`:
- **Photo tile** — background image `assets/tile-1…5.jpg` (pre-baked crops of the crash photo, some desaturated, one red-tinted), `cover`, centered.
- **Telltale tile** — flat fill `#111116` / `#0C0C10` alternating, with a single 40px warning glyph centered, colored `#D0021B` (critical) or `#E8A317` (warning).

Over the marquee: a vignette `radial-gradient(118% 76% at 50% 50%, rgba(8,8,10,0) 22%, rgba(8,8,10,.68) 64%, #08080A 100%)`.

**Liquid-glass bubble** — `max-width: 322`, padding `24px 28px`, radius `28px` with `borderBottomLeftRadius: 9` (speech tail corner), `isolation: isolate`, `overflow: hidden`:
- fill `linear-gradient(-72deg, rgba(255,255,255,.10), rgba(255,255,255,.22) 45%, rgba(255,255,255,.08))`
- `backdrop-filter: blur(16px) saturate(1.6)`
- shadows: `inset 0 1.5px 1px rgba(255,255,255,.42)`, `inset 0 -2px 2px rgba(0,0,0,.28)`, `inset 0 0 0 1px rgba(255,255,255,.20)`, `0 24px 60px rgba(0,0,0,.5)`
- a specular highlight child: absolutely positioned `left:6% right:34% top:2px height:34%`, `borderRadius: 50%`, `linear-gradient(180deg, rgba(255,255,255,.34), transparent)`, `blur(6px)`
- text: **29px / 34px, weight 600, letter-spacing −0.7px, `#FFFFFF`**, `textShadow: 0 2px 10px rgba(0,0,0,.35)`. Copy, verbatim: `Did you f*cking check?`
- entrance keyframes (0.62 s, `cubic-bezier(.2,.9,.25,1)`): `0% opacity 0, translateY(20px) scale(.84)` → `58% opacity 1, translateY(0) scale(1.05)` → `100% scale(1)`

### 2. Auth (same file, `phase: 'auth'`)

Backdrop stack, bottom to top: the still-blurred crash photo → four animated color blobs → `rgba(8,8,10,.42)` scrim → content.

**Blobs** (all `borderRadius: 50%`, radial-gradient fills fading to transparent at 70%, looping 20–26 s ease-in-out translate+scale drifts of ±26px / 1.06–1.08):
| Color | Size | Position | Blur |
|---|---|---|---|
| `rgba(201,138,58,.85)` amber | 420×300 | left −120, bottom 120 | 58px |
| `rgba(109,74,224,.8)` purple | 340×300 | right −100, top 60 | 54px |
| `rgba(142,27,42,.8)` red | 300×280 | right −70, bottom 60 | 60px |
| `rgba(27,110,150,.75)` blue | 300×240 | left 40, top −60 | 56px |

**Header** (top, centered, 22px top padding): 26×26 `#0CB8E9` rounded-8 tile with `ri-shield-check-fill` at 15px `#04222C`, then `Recall Hub` at 15px/600, letter-spacing −0.2px, white.

**Body** — centered column, `gap: 20`, horizontal padding 24, max content width 320.

Step `email`:
- Display line: **Instrument Serif, 52px / 52px, weight 400, letter-spacing −1px, white, centered, `text-wrap: balance`** — copy: `Get started with Recall Hub`
- `Continue with` — 13px/500, `rgba(255,255,255,.62)`
- Two glass pills side by side, `gap: 12`, 42px tall, padding `0 18px`, radius 999: Google (official 4-color mark, 19px) and Apple (`ri-apple-fill`, 19px white); label 14px/600 white. Glass recipe: fill `linear-gradient(-72deg, rgba(255,255,255,.06), rgba(255,255,255,.16) 45%, rgba(255,255,255,.05))`, `backdrop-filter: blur(8px)`, shadows `inset 0 1px 1px rgba(255,255,255,.30)`, `inset 0 -1.5px 1.5px rgba(0,0,0,.35)`, `inset 0 0 0 1px rgba(255,255,255,.14)`, `0 8px 18px rgba(0,0,0,.4)`. Press: `scale(.98)`.
- `OR` divider: 1px `rgba(255,255,255,.14)` rules either side, label 11px/600, letter-spacing .4px, `rgba(255,255,255,.5)`
- Email field: glass pill, height 52, radius 999, padding `0 6px 0 16px`, `gap: 8`; `ri-mail-line` 18px `rgba(255,255,255,.72)`; input 15px white, placeholder `rgba(255,255,255,.45)`; trailing 40×40 round arrow button (`ri-arrow-right-line`, brighter glass: `rgba(255,255,255,.10 → .24 → .08)`, `inset 0 1px 1px rgba(255,255,255,.4)`, `inset 0 0 0 1px rgba(255,255,255,.18)`) that appears **only when the email matches `/\S+@\S+\.\S+/`**.

Step `password`: display line `Create your password` (Instrument Serif 46/48), sub-line `At least 6 characters. <email>` (13px/500, `rgba(255,255,255,.6)`). The email pill stays mounted above; below it a password pill with a leading eye toggle (`ri-eye-line` / `ri-eye-off-line`, 34×34 hit area) and the same trailing arrow, shown when length ≥ 6. `Go back` row underneath: `ri-arrow-left-line` 14px + 13px label, both `rgba(255,255,255,.6)`.

Step `confirm`: display line `One last step`, sub-line `Confirm your password to continue`. Only the confirm pill is mounted (email pill unmounts). Arrow appears at length ≥ 6. Mismatch shows `Passwords do not match.` at 12.5px `#FF8A94`, centered; correct match calls `onDone()`.

Footer, 30px from bottom, centered: `Already have an account? ` 13px `rgba(255,255,255,.55)` + `Sign in` white/500 — also calls `onDone()`.

Every step block enters with a 0.5 s `opacity 0 → 1`, `translateY(10px) → 0`, `blur(6px) → 0`.

### 3. The app (`design/GaragePrototype.dc.html`)

Frame: white `#FFFFFF`, a dot-pattern base layer, then a `flex-direction: column` stack of the active tab's scroll view plus the tab bar. Tab state: `tab: 'garage' | 'recalls' | 'service' | 'hub' | 'profile'`.

**Dot pattern** — full-bleed SVG of dots, `fill: rgba(120,120,120,0.48)`, faded at all four edges with a linear-gradient mask. Built in `dots()` in the logic class. In RN: a tiled PNG plus a masked gradient, or `react-native-svg` + `MaskedView`.

**Screen header pattern** — 56px min-height row, 20px side padding: 20px `ri-menu-2-line` `#6b6a72` on the left, centered 11px Geist Mono screen title, letter-spacing 2.6px, `#6b6a72` (e.g. `RECALL HUB`), notification bell on the right.

**Tab bar** (the most fiddly piece — read the markup carefully): a dark `#17181A` bar with `borderRadius: 11px 11px 28px 28px`, only **34px** total height. Above it, a **hump** cut in the bar's own color (`#17181A`) — 61 × 13.7px, `clip-path: url(#menu-clip-path)` referencing an inline SVG path, positioned `bottom: calc(100% - 1px)` and slid horizontally to the active tab with `transform: translate3d(x,0,0)`, `transition: .55s cubic-bezier(.2,.9,.2,1)`. The active tab's icon **lifts** into the hump and sits centered on a 28px white circle; inactive icons are 15px, dimmed. Five tabs, `flex: 1` each, 28px rows:

| id | label | active icon | inactive icon |
|---|---|---|---|
| garage | GARAGE | `ri-inbox-fill` | `ri-inbox-line` |
| recalls | RECALLS | `ri-error-warning-fill` | `ri-error-warning-line` |
| service | SERVICE | `ri-tools-fill` | `ri-tools-line` |
| hub | HUB | `ri-book-2-fill` | `ri-book-2-line` |
| profile | PROFILE | `ri-user-fill` | `ri-user-line` |

The hump's x position is measured from the live DOM (`placeHump()` reads each tab item's offset). In RN, compute it from `onLayout` of the tab items, or simply `screenWidth / 5 · (index + 0.5) - 30.5`.

**Garage tab** — header, then a horizontal snap pager of vehicle cards (one per vehicle, dots pager beneath), each card showing name, meta (`2024 Tesla · 42,000 mi`), a health ring, range, masked VIN (`···· F12345`), a sync caption (`SYNCED 2 MIN AGO`), and — when the vehicle has a recall — a caution row with the NHTSA code and title. Two CTAs per card: **Schedule Repair** (full blue chrome, the "liquid metal" button) and **Details** (outlined). Below: an "Add vehicle" affordance that opens the **VIN entry sheet** (bottom sheet, `animation: sheet-up .34s`), which has an info icon opening a full-screen **"Where to find your VIN"** explainer with two CTAs pinned to the bottom.

**Recalls tab** — hero card with open / scheduled / resolved counts, a filter (`open | scheduled | all`), and an infinite, centering carousel of recall cards that expand into detail.

**Service tab** — a caution-bordered "recall reason" card at the top that expands to the recall detail, a **tilt-responsive location map** (reads `deviceorientation` on iOS with permission request, falls back to pointer position on desktop), and a scheduling block: method (`dropoff | pickup`), date, time, confirm → success toast.

**Hub tab** — a featured-articles carousel that **auto-advances every 5 s** and is swipeable/draggable (article-to-article horizontal swipes with `art-in` / `art-out` / `art-back-in` / `art-back-out` transitions), a counter (`01 / 04`), then a **4-column grid of 20 dashboard-light tiles** (`aspect-ratio: 1`, radius 14, `#F2F1EE` fill) filterable by severity (`all | critical | warning | info`). Tapping a tile opens a bottom sheet explaining what the light means and what to do. Article rows open a full-screen reader.

**Profile tab** — profile header, notification toggles (push / email / biometric), and a collapsible **Membership** section: three plans (Standard, Plus at $9, Pro). Plus is the featured plan — it gets an animated conic-gradient "shine" border (`shine-spin 4s linear infinite` over `conic-gradient(from 0deg,#3b82f6,#ef4444,#2dd4bf,#3b82f6)` blurred 4px) and the metal CTA; the others are outlined. "Select your protection level" opens as its own full screen sliding up from the bottom (`screen-up .34s`) on white.

**Concierge chat** — a scripted conversation about the Model S recall, with typing indicator (`dot-bob` keyframes) and left/right bubble entrances (`bub-in-l` / `bub-in-r`).

**Liquid metal buttons** — the signature element. A multi-stop chrome gradient plus a slowly drifting blob layer (`blob3` keyframes translating a blurred highlight around the button) and a press ripple (`lm-rip3`). Two tint sets are defined in the logic class:
- `TINT_BLUE` (full blue chrome): `#1B6E96, #8ACEFF, #E8F6FF, #B8E2FF, #0E5378, #F4FBFF, #4E9DC4, #A7DAFF`
- `TINT_MIX` (neutral chrome with blue highlights): `#8A8A8A, #EDEDED, #2B2B2B, #8ACEFF, #141414, #E8F6FF, #3E5B6B, #A6A6A6`

---

## Interactions & behavior

- **Splash → auth → app.** `Splash` takes one prop, `onDone()`. The app renders it as a full-bleed overlay at `z-index: 60` while `state.splash === true`; completing sign-up, tapping Sign in, or tapping an OAuth pill calls `onDone()`, which sets `splash: false` and reveals the Garage. In Expo this is a route/stack: `Splash` screen → `App` tabs, or conditional render at the root.
- **Tab switching** — hump slides to the active tab (0.55 s), the active icon lifts and its white circle pops, colors cross-fade over 0.3 s.
- **Bottom sheets** — slide up 0.34 s `cubic-bezier(.2,.85,.2,1)`, dismissed by the close button or backdrop tap.
- **Full screens** (VIN help, membership, article reader, stats) — slide up from the bottom over white, close button top-left.
- **Carousels** — Hub articles auto-advance every 5 s and are draggable; Recalls carousel centers the active card. Both are infinite (the list is tripled and the scroll position recentered).
- **Tilt map** — `DeviceOrientationEvent` (requesting permission on iOS) drives an offset on the map layer; pointer position substitutes on desktop.
- **Form validation** — email `/\S+@\S+\.\S+/`; password and confirm each ≥ 6 characters; confirm must equal password or the mismatch line shows.
- **Toasts** — 2.2 s, pinned 104px from the bottom (clear of the tab bar), dark pill with `ri-checkbox-circle-line`.

## State management

Splash: `phase`, `step`, `email`, `pw`, `cf`, `eye`, `err`.

App (single component, `state` at the top of the logic class — read it for the full list): `tab`, `idx` (vehicle pager), `sheet` (`'add' | 'recall' | null`), `screen` (`'stats' | 'membership' | null`), `statsId`, `humpX`, `rFilter` / `rOpen` / `rDetail` (recalls), `plan`, `chatShown` / `chatTyping` / `chatDraft` / `chatLog`, `hubIdx` / `hubGroup` / `hubLight` / `article` / `artDir` / `artLeaving` / `artDrag`, `mapOpen` / `tiltOn` / `tiltX` / `tiltY`, `svcReason` / `svcMethod` / `svcDate` / `svcTime` / `svcDone`, `pfPush` / `pfEmail` / `pfBio`, `vin`, `scheduled`, `toast`, `splash`, and `vehicles[]`.

All content is hardcoded in the logic class as `ARTICLES`, `LIGHTS` (20 dashboard lights, each with `group`, `name`, `short`, `icon`, `tone`, `means`, `action`), `TABS`, `PLANS`, `CHAT_SCRIPT`, `DECODE` (VIN decode result), `DEMO_VIN = '1FTVW1EL5NWG00001'`, and `state.vehicles`. **Lift these into typed fixtures/JSON on port** — they are the demo dataset and should survive as-is so the demo reads identically.

## Design tokens

**Colors**
| Token | Value | Use |
|---|---|---|
| Blue (primary) | `#0CB8E9` | primary CTAs, active accents, links |
| Blue deep | `#0E5378` / `#1B6E96` | chrome gradient stops |
| Blue light | `#8ACEFF` / `#A7DAFF` / `#E8F6FF` / `#F4FBFF` | chrome highlights |
| Red (critical) | `#D0021B` | critical telltales, recall alerts |
| Red soft | `#FF8A94` | error text on dark |
| Amber (warning) | `#E8A317`; badge `#FBE9CB` on `#7A5307` | warning telltales |
| Teal (info) | `#01a08c` | info telltales |
| Info badge | `#E7F1F7` on `#0B4E73` | status-only pills |
| Ink | `#101014` / `#17161A` | primary text |
| Ink secondary | `#6b6a72` | body/meta text |
| Ink tertiary | `#8A8992` / `#63626a` / `#57565e` | captions, mono labels |
| Surface | `#FFFFFF` | app background |
| Surface sunken | `#FAFAF8` / `#F2F1EE` | inputs, light tiles |
| Border | `#E4E3DF`, `rgba(0,0,0,0.09)` | hairlines, frame inset |
| Bar dark | `#17181A` | tab bar + hump |
| Splash base | `#08080A` | splash/auth background |
| Tile base | `#0E0E12` / `#111116` / `#0C0C10` | marquee tiles |

**Typography** — Geist (300/400/500/600/700) for UI, Geist Mono (400/500) for labels and captions, Instrument Serif (400) for auth display lines.
| Role | Spec |
|---|---|
| Display (serif) | 52/52, −1px |
| Display small (serif) | 46/48 |
| Screen title | 32/36, 600, −1.1px |
| Card title | 26/31, 600, −0.6px |
| Bubble | 29/34, 600, −0.7px |
| Body | 14/21 or 13/19, 400 |
| Button | 15, 500 |
| Mono label L | 11, letter-spacing 2.6px |
| Mono label M | 10, letter-spacing 1.8–2.8px |
| Mono label S | 9, letter-spacing 1.4–1.6px |

**Radius** — 8 (small tile), 12 (marquee tile, input), 14 (light tile, primary button), 16 (plan card, logo mark), 26–28 (bubble, sheets), 30 (device frame), 999 (pills). Tab bar: `11 11 28 28`.

**Spacing** — 20px screen gutter (24 on auth), 8 / 10 / 12 / 14 / 16 / 26px gaps. Control heights: 28 (tab row), 34 (tab bar), 42 (glass pill), 46 (input), 50–52 (primary button / glass field), 56 (header row).

**Shadows** — tile `0 18px 40px rgba(0,0,0,.55)`; glass pill `0 8px 18px rgba(0,0,0,.4)`; glass field `0 10px 24px rgba(0,0,0,.4)`; bubble `0 24px 60px rgba(0,0,0,.5)`; logo mark `0 14px 34px rgba(0,0,0,.6)`; frame inset `inset 0 0 0 1px rgba(0,0,0,0.09)`.

**Motion** — standard ease `cubic-bezier(.2,.8,.2,1)`; springy `cubic-bezier(.2,.9,.25,1)`; sheet `cubic-bezier(.2,.85,.2,1)`. Durations: 0.3 s (color/opacity), 0.34 s (sheet/screen), 0.5 s (step enter), 0.55 s (hump), 0.62 s (bubble pop), 0.8 s (auth fade).

## Assets

In `design/assets/`:
- `crash.png` — the original user-supplied crash photo (804 × 1722). **User's own photograph; not licensed stock.**
- `crash-hero.jpg` — 720 × 1542 recompression of it, used full-bleed on the splash and behind the auth screen.
- `tile-1…5.jpg` — 336 × 224 pre-baked crops of the same photo for the marquee: `1` warm, `2` desaturated, `3` red-tinted, `4` warm wide, `5` desaturated tight. Each already carries its tint and a `rgba(8,8,10,.26)` darkening pass, so no runtime filters are needed.

**Icons: Remixicon 4.5.0**, loaded as a webfont and referenced by class (`ri-shield-check-fill`, `ri-alarm-warning-fill`, `ri-oil-fill`, `ri-temp-hot-fill`, `ri-battery-2-charge-fill`, `ri-steering-2-fill`, `ri-error-warning-fill`, `ri-drop-fill`, `ri-car-fill`, `ri-disc-line`, `ri-mail-line`, `ri-eye-line`, `ri-eye-off-line`, `ri-arrow-right-line`, `ri-arrow-left-line`, `ri-apple-fill`, …). In Expo, install `react-native-remix-icon` to keep the exact glyphs, or map each to `@expo/vector-icons` — **if you map, check every glyph visually**; the warning telltales carry meaning.

**Fonts** — Geist, Geist Mono, Instrument Serif (Google Fonts). Bundle with `expo-font` / `@expo-google-fonts/*`.

**Known gap:** the 20 dashboard-light tiles use approximated Remixicon glyphs, not real ISO 2575 telltale symbols. If you can source the proper telltale SVG set, swap them 1-for-1 — the tile ids in `LIGHTS` are stable (`l1`…`l20`).

**Google mark** — the 4-color `G` is inlined as SVG paths in `Splash.dc.html`. Follow Google's branding guidelines for the sign-in button in production.

## Porting notes for Expo

Runs fine in Expo Go with these substitutions:

| Design uses | Expo / RN equivalent |
|---|---|
| `backdrop-filter: blur()` (glass bubble, glass pills) | `expo-blur` `<BlurView tint="dark" intensity={…}>` + the same gradient fill and inset borders. On iOS 26+, consider Apple's native `.glassEffect` via a small native module for the real material. |
| `filter: blur()` on the accelerating marquee (motion blur) | No RN filter API. Either `react-native-skia` (`Blur` image filter) or approximate with layered opacity trails. **Expected fidelity loss — flag it, don't redesign around it.** |
| `filter: blur()` on the static crash photo | Pre-blur it as a second image asset and cross-fade; cheapest and pixel-exact. |
| Blurred color blobs on auth | Pre-baked blurred PNGs, or `expo-linear-gradient` radial approximations, or Skia. |
| Animated conic-gradient shine (Plus plan) | Skia sweep gradient, or a looping rotated PNG behind a masked border. |
| Liquid metal gradient buttons | `expo-linear-gradient` for the base stops; the drifting highlight as a Reanimated-driven translate on a blurred asset. |
| `clip-path: url()` tab-bar hump | `react-native-svg` `<Path>` in the bar's fill color. |
| Dot-pattern background | Tiled PNG + `MaskedView` gradient, or `react-native-svg`. |
| `deviceorientation` (tilt map) | `expo-sensors` `DeviceMotion` — better than the web API; keep the same offset math. |
| rAF timeline (splash) | `react-native-reanimated` `withTiming` / `useFrameCallback`. Keep the exact easing exponents given above. |
| CSS transitions | Reanimated shared values with the durations/easings in Design tokens. |
| Snap carousels | `FlatList` with `pagingEnabled` / `snapToInterval`, or `react-native-reanimated-carousel`. |
| Fixed 430 × 932 frame | Drop it; use `SafeAreaView` + `Dimensions`. All inner values are already points. |
| Web inputs | `TextInput` with `placeholderTextColor: 'rgba(255,255,255,.45)'`, `keyboardType="email-address"`, `autoCapitalize="none"`, `secureTextEntry` for passwords. |

**Not in Expo Go:** if you add a native module for Apple's Liquid Glass, that requires a development build (`expo prebuild` / EAS), not Expo Go. Everything else above works in Expo Go.

**One content flag:** the splash copy `Did you f*cking check?` will raise the App Store age rating and risks review pushback even masked. Fine for the demo; plan a shipping variant.

## Files

- `design/Splash.dc.html` — splash timeline + auth screen (self-contained; the primary reference for both).
- `design/GaragePrototype.dc.html` — the whole app: five tabs, sheets, full screens, chat, tab bar. Imports `Splash` as a child and mounts it as the launch overlay.
- `design/support.js` — the runtime the two files need in order to open in a browser. **Reference only — do not port it.**
- `design/assets/` — images listed above.

To view the design as intended, open `design/GaragePrototype.dc.html` in a browser (it needs `support.js` alongside it, which it is). The splash plays on load; `REPLAY` re-runs it.
